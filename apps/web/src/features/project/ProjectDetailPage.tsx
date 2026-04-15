import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature } from '@/lib/api';
import { ArrowLeft, Menu, PlusCircle, Sparkles, AlertTriangle, Trash2, Workflow } from 'lucide-react';
import { PipelineConfigEditor } from './components/PipelineConfigEditor';
import { ProjectOverview } from './components/ProjectOverview';
import { FeatureContentEditor } from './components/FeatureContentEditor';
import { SSRExtractModal } from './components/SSRExtractModal';
import { SSRSyncWarningDialog } from './components/SSRSyncWarningDialog';
import { ProjectWorkspaceSidebar } from './components/ProjectWorkspaceSidebar';
import { ProjectFeatureStatusBadges } from './components/ProjectFeatureStatusBadges';
import { AppFeedbackDialog } from '@/features/feedback/components/AppFeedbackDialog';
import { useSSRSyncWarnings } from './hooks/use-feature-sync';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const activeModel = useAppStore((s) => s.activeModel);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [featureType, setFeatureType] = useState<'FEATURE' | 'SSR'>('FEATURE');
  const [showForm, setShowForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ssrExtractFeatureId, setSsrExtractFeatureId] = useState<string | null>(null);
  const [ssrSyncWarningId, setSsrSyncWarningId] = useState<string | null>(null);
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);

  const { data: ssrSyncWarnings } = useSSRSyncWarnings(ssrSyncWarningId ?? undefined);

  // Auto-dismiss sync warning state if no conflicts exist after publish
  const handlePublishSsrId = (featureId: string) => {
    setSsrSyncWarningId(featureId);
  };

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.projects.get(projectId!),
    enabled: !!projectId,
  });

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['features', projectId],
    queryFn: () => api.features.list(projectId!),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.features.create(projectId!, { name, description, featureType }),
    onSuccess: async (createdFeature) => {
      await qc.invalidateQueries({ queryKey: ['features', projectId] });
      setName('');
      setDescription('');
      setFeatureType('FEATURE');
      setShowForm(false);
      setSearchParams({ feature: createdFeature.id });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.features.delete(id),
    onSuccess: async (_, deletedFeatureId) => {
      await qc.invalidateQueries({ queryKey: ['features', projectId] });
      setFeatureToDelete((current) => (current?.id === deletedFeatureId ? null : current));
      setSsrExtractFeatureId((current) => (current === deletedFeatureId ? null : current));
      setSsrSyncWarningId((current) => (current === deletedFeatureId ? null : current));
      if (searchParams.get('feature') === deletedFeatureId) {
        setSearchParams({ view: 'overview' }, { replace: true });
      }
    },
  });

  const selectedFeatureId = searchParams.get('feature');
  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedFeatureId) ?? null,
    [features, selectedFeatureId],
  );

  useEffect(() => {
    if (!selectedFeatureId || isLoading) return;
    if (selectedFeature) return;
    setSearchParams({ view: 'overview' }, { replace: true });
  }, [isLoading, selectedFeature, selectedFeatureId, setSearchParams]);

  const ssrExtractFeature = ssrExtractFeatureId
    ? features.find((f: Feature) => f.id === ssrExtractFeatureId)
    : null;

  const selectedSsrOutOfSyncCount = selectedFeature?.featureType === 'SSR'
    ? features.filter(
      (child) =>
        child.extractedFromSSRId === selectedFeature.id && child.syncStatus === 'OUT_OF_SYNC',
    ).length
    : 0;

  const selectOverview = () => {
    setSearchParams({ view: 'overview' });
    setMobileMenuOpen(false);
  };

  const selectFeature = (featureId: string) => {
    setSearchParams({ feature: featureId });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted lg:hidden"
            aria-label="Open project menu"
          >
            <Menu size={18} />
          </button>

          <Link
            to="/projects"
            className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex"
          >
            <ArrowLeft size={14} /> All Projects
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Project Workspace
            </p>
            <h1 className="truncate text-2xl font-semibold">
              {project?.name ?? (isProjectLoading ? 'Loading project...' : 'Project')}
            </h1>
            {project?.description && (
              <p className="truncate text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AppFeedbackDialog
              pageTitle="Project Detail"
              contextLabel={project?.name || 'Project'}
              className="hidden sm:flex"
            />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              <PlusCircle size={16} /> New Feature
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-6">
            <ProjectWorkspaceSidebar
              features={features}
              selectedFeatureId={selectedFeature?.id}
              onSelectFeature={selectFeature}
              onSelectOverview={selectOverview}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl space-y-6">
            {selectedFeature ? (
              <>
                <section className="rounded-xl border bg-card p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Feature
                      </p>
                      <div>
                        <h2 className="text-2xl font-semibold">{selectedFeature.name}</h2>
                        {selectedFeature.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedFeature.description}
                          </p>
                        )}
                      </div>
                      <ProjectFeatureStatusBadges feature={selectedFeature} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedFeature.featureType === 'SSR' && selectedFeature.content && (
                        <button
                          type="button"
                          onClick={() => setSsrExtractFeatureId(selectedFeature.id)}
                          className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
                        >
                          <Sparkles size={12} /> Extract
                        </button>
                      )}
                      {selectedFeature.featureType === 'SSR' && selectedSsrOutOfSyncCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setSsrSyncWarningId(selectedFeature.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 hover:bg-yellow-100"
                        >
                          <AlertTriangle size={12} /> {selectedSsrOutOfSyncCount} out of sync
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/features/${selectedFeature.id}`)}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs hover:bg-muted"
                      >
                        <Workflow size={12} /> Pipeline
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeatureToDelete(selectedFeature)}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-6">
                  <FeatureContentEditor
                    key={selectedFeature.id}
                    feature={selectedFeature}
                    allFeatures={features}
                    onPublish={(featureId) => {
                      if (selectedFeature.featureType === 'SSR') {
                        handlePublishSsrId(featureId);
                      }
                    }}
                  />
                </section>
              </>
            ) : (
              <>
                <section className="rounded-xl border bg-card p-6">
                  <div className="mb-6 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Overview
                    </p>
                    <h2 className="text-2xl font-semibold">{project?.name ?? 'Project overview'}</h2>
                    {project?.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                  </div>

                  {project ? (
                    <ProjectOverview project={project} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {isProjectLoading ? 'Loading overview...' : 'Project not found.'}
                    </p>
                  )}
                </section>

                <details className="rounded-xl border bg-card">
                  <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold">
                    Pipeline AI Configuration
                  </summary>
                  <div className="px-6 pb-6 pt-1">
                    <PipelineConfigEditor projectId={projectId!} />
                  </div>
                </details>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="left-0 top-0 h-full w-[86vw] max-w-[320px] translate-x-0 translate-y-0 gap-0 rounded-none border-r p-0 data-[state=closed]:slide-out-to-left data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left data-[state=open]:slide-in-from-top-0 sm:rounded-none">
          <ProjectWorkspaceSidebar
            className="h-full rounded-none border-0"
            features={features}
            selectedFeatureId={selectedFeature?.id}
            onSelectFeature={selectFeature}
            onSelectOverview={selectOverview}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Feature</DialogTitle>
            <DialogDescription>
              Add a new feature or SSR document to this project workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              {(['FEATURE', 'SSR'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeatureType(type)}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                    featureType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {type === 'SSR' ? 'SSR Document' : 'Feature'}
                </button>
              ))}
            </div>

            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Feature name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full resize-none rounded-md border bg-background px-3 py-2"
              placeholder="Description (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSR Extraction Modal */}
      {ssrExtractFeature && (
        <SSRExtractModal
          feature={ssrExtractFeature}
          featureId={ssrExtractFeature.id}
          projectId={projectId!}
          featureName={ssrExtractFeature.name}
          provider={activeProvider ?? undefined}
          model={activeModel ?? undefined}
          onClose={() => setSsrExtractFeatureId(null)}
        />
      )}

      {/* SSR Sync Warning Dialog */}
      {ssrSyncWarningId && (
        <SSRSyncWarningDialog
          projectId={projectId!}
          warnings={ssrSyncWarnings ?? null}
          onClose={() => setSsrSyncWarningId(null)}
        />
      )}

      <Dialog
        open={!!featureToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setFeatureToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {featureToDelete?.featureType === 'SSR' ? 'SSR' : 'feature'}?</DialogTitle>
            <DialogDescription>
              {featureToDelete
                ? `This will permanently delete "${featureToDelete.name}" and its related data.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setFeatureToDelete(null)}
              disabled={deleteMutation.isPending}
              className="border px-4 py-2 rounded-md hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => featureToDelete && deleteMutation.mutate(featureToDelete.id)}
              disabled={!featureToDelete || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
