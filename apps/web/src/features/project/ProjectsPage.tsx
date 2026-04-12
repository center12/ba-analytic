import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type Project } from '@/lib/api';
import { PlusCircle, FolderOpen, Trash2, Users, LogOut, List } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function ProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  });

  const createMutation = useMutation({
    mutationFn: () => api.projects.create({ name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setName('');
      setDescription('');
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/feedback')}
            className="flex items-center gap-2 border px-3 py-2 rounded-md hover:bg-muted text-sm"
            title="Feedback list"
          >
            <List size={16} /> Feedback
          </button>
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 border px-3 py-2 rounded-md hover:bg-muted text-sm"
            title="User management"
          >
            <Users size={16} /> Users
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
          >
            <PlusCircle size={18} /> New Project
          </button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="flex items-center gap-2 border px-3 py-2 rounded-md hover:bg-muted text-sm text-muted-foreground"
            title={`Signed in as ${user?.username}`}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg">Create Project</h2>
          <input
            className="w-full border rounded-md px-3 py-2 bg-background"
            placeholder="Project name"
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
            <button
              onClick={() => setShowForm(false)}
              className="border px-4 py-2 rounded-md hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          No projects yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4">
          {projects.map((p: Project) => (
            <div
              key={p.id}
              className="bg-card border rounded-lg p-5 flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <button
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center gap-3 text-left flex-1"
              >
                <FolderOpen size={20} className="text-primary shrink-0" />
                <div>
                  <p className="font-semibold">{p.name}</p>
                  {p.description && (
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {p._count?.features ?? 0} features
                  </p>
                </div>
              </button>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
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
