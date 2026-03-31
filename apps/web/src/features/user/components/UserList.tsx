import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';

export function UserList() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

  if (users.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">No users yet.</p>
    );
  }

  return (
    <div className="grid gap-3">
      {users.map((u: User) => (
        <div
          key={u.id}
          className="bg-card border rounded-lg px-5 py-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium">{u.username}</p>
            <p className="text-xs text-muted-foreground">
              Created {new Date(u.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
