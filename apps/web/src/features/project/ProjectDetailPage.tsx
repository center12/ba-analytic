import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature } from '@/lib/api';
import { ArrowLeft, PlusCircle, Layers, Trash2, ChevronDown, ChevronUp, Sparkles, FileText } from 'lucide-react';
import { PipelineConfigEditor } from './components/PipelineConfigEditor';
import { ProjectOverview } from './components/ProjectOverview';
import { FeatureContentEditor } from './components/FeatureContentEditor';
import { SSRExtractModal } from './components/SSRExtractModal';
import { AppFeedbackDialog } from '@/features/feedback/components/AppFeedbackDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store';

const FEATURE_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  SSR: { label: 'SSR', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  FEATURE: { label: 'Feature', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const activeModel = useAppStore((s) => s.activeModel);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [featureType, setFeatureType] = useState<'FEATURE' | 'SSR'>('FEATURE');
  const [showForm, setShowForm] = useState(false);
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
  const [ssrExtractFeatureId, setSsrExtractFeatureId] = useState<string | null>(null);
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);

  const { data: project } = useQuery({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      setName('');
      setDescription('');
      setFeatureType('FEATURE');
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.features.delete(id),
    onSuccess: (_, deletedFeatureId) => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      setFeatureToDelete((current) => (current?.id === deletedFeatureId ? null : current));
      setExpandedFeatureId((current) => (current === deletedFeatureId ? null : current));
      setSsrExtractFeatureId((current) => (current === deletedFeatureId ? null : current));
    },
  });

  const ssrExtractFeature = ssrExtractFeatureId
    ? features.find((f: Feature) => f.id === ssrExtractFeatureId)
    : null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Link to="/projects" className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft size={14} /> All Projects
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          {project?.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AppFeedbackDialog
            pageTitle="Project Detail"
            contextLabel={project?.name || 'Project'}
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
          >
            <PlusCircle size={18} /> New Feature
          </button>
        </div>
      </div>

      {/* Project Overview */}
      {project && (
        <div className="border rounded-lg p-5 mb-6">
          <ProjectOverview project={project} />
        </div>
      )}

      {/* Pipeline AI Configuration */}
      <details className="border rounded-lg mb-6">
        <summary className="px-5 py-3 font-semibold cursor-pointer select-none text-sm">
          Pipeline AI Configuration
        </summary>
        <div className="px-5 pb-4 pt-2">
          <PipelineConfigEditor projectId={projectId!} />
        </div>
      </details>

      {/* Create Feature Form */}
      {showForm && (
        <div className="bg-card border rounded-lg p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg">Create Feature</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            {(['FEATURE', 'SSR'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFeatureType(t)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  featureType === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {t === 'SSR' ? 'SSR Document' : 'Feature'}
              </button>
            ))}
          </div>
          <input
            className="w-full border rounded-md px-3 py-2 bg-background"
            placeholder="Feature name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full border rounded-md px-3 py-2 bg-background resize-none"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-md hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feature List */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : features.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">No features yet.</p>
      ) : (
        <div className="grid gap-3">
          {features.map((f: Feature) => {
            const badge = FEATURE_TYPE_BADGE[f.featureType ?? 'FEATURE'];
            const isExpanded = expandedFeatureId === f.id;

            return (
              <div key={f.id} className="bg-card border rounded-lg overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <Layers size={18} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono rounded border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
                        {f.code}
                      </span>
                      <span className="font-semibold truncate">{f.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                      {f.content && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText size={11} /> Has content
                        </span>
                      )}
                    </div>
                    {f.description && (
                      <p className="text-sm text-muted-foreground truncate">{f.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {f.featureType === 'SSR' && f.content && (
                      <button
                        onClick={() => setSsrExtractFeatureId(f.id)}
                        className="flex items-center gap-1 text-xs border px-2 py-1 rounded hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors"
                        title="Extract features from this SSR"
                      >
                        <Sparkles size={12} /> Extract
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/projects/${projectId}/features/${f.id}`)}
                      className="text-xs border px-2 py-1 rounded hover:bg-muted"
                    >
                      Pipeline
                    </button>
                    <button
                      onClick={() => setExpandedFeatureId(isExpanded ? null : f.id)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                      title="Edit content"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => setFeatureToDelete(f)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    <FeatureContentEditor
                      feature={f}
                      allFeatures={features}
                      onClose={() => setExpandedFeatureId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
