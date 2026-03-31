import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function CreateUserForm() {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => api.users.create({ username, password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setUsername('');
      setPassword('');
      setShowForm(false);
    },
  });

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
      >
        + New User
      </button>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <h2 className="font-semibold text-lg">Create User</h2>
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="e.g. john_doe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Lowercase letters, numbers, and underscores only (3–30 characters)
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {createMutation.isError && (
        <p className="text-sm text-destructive">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : 'Failed to create user'}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => createMutation.mutate()}
          disabled={!username || !password || createMutation.isPending}
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
  );
}
