import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CreateUserForm } from './components/CreateUserForm';
import { UserList } from './components/UserList';

export function UserManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">Users</h1>
      </div>

      <div className="space-y-6">
        <CreateUserForm />
        <UserList />
      </div>
    </div>
  );
}
