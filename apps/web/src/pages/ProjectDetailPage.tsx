import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature } from '@/lib/api';
import { ArrowLeft, PlusCircle, Layers, Trash2 } from 'lucide-react';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

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
    mutationFn: () => api.features.create(projectId!, { name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      setName('');
      setDescription('');
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.features.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features', projectId] }),
  });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Link to="/projects" className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft size={14} /> All Projects
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          {project?.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          <PlusCircle size={18} /> New Feature
        </button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg">Create Feature</h2>
          <input
            className="w-full border rounded-md px-3 py-2 bg-background"
            placeholder="Feature name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full border rounded-md px-3 py-2 bg-background resize-none"
            placeholder="Description (optional)"
            rows={3}
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

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : features.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">No features yet.</p>
      ) : (
        <div className="grid gap-4">
          {features.map((f: Feature) => (
            <div
              key={f.id}
              className="bg-card border rounded-lg p-5 flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <button
                onClick={() => navigate(`/projects/${projectId}/features/${f.id}`)}
                className="flex items-center gap-3 text-left flex-1"
              >
                <Layers size={20} className="text-primary shrink-0" />
                <div>
                  <p className="font-semibold">{f.name}</p>
                  {f.description && (
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.baDocument ? 'BA Doc uploaded' : 'No BA doc yet'}
                  </p>
                </div>
              </button>
              <button
                onClick={() => deleteMutation.mutate(f.id)}
                className="text-muted-foreground hover:text-destructive p-2 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
