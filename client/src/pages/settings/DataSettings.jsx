import { Database, Upload, Trash2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import toast from 'react-hot-toast';
import { Badge } from '../../components/common/Badge';

const DataSettings = () => {
  const handleExport = () => {
    toast.success('Data export started');
  };

  const handleDelete = () => {
    toast.error('This action cannot be undone');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Management{' '}
          <Badge variant="primary" size="sm">
            Available in future updates
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <Button
          variant="secondary"
          className="w-full"
          icon={Upload}
          onClick={handleExport}
        >
          Export All Data
        </Button>
        <Button
          variant="danger"
          className="w-full"
          icon={Trash2}
          onClick={handleDelete}
        >
          Delete Workspace
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataSettings;
