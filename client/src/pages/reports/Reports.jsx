import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Users,
  FolderKanban,
  CheckSquare,
  DollarSign,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

import EmployeePerformanceReport from './EmployeePerformanceReport';
import ProjectProgressReport from './ProjectProgressReport';
import TaskCompletionReport from './TaskCompletionReport';
import RevenueSummaryReport from './RevenueSummaryReport';

const reportTypes = [
  {
    id: 'employee-performance',
    label: 'Employee Performance',
    icon: Users,
    color: 'blue',
    endpoint: '/reports/employee-performance',
    component: EmployeePerformanceReport,
  },
  {
    id: 'project-progress',
    label: 'Project Progress',
    icon: FolderKanban,
    color: 'purple',
    endpoint: '/reports/project-progress',
    component: ProjectProgressReport,
  },
  {
    id: 'task-completion',
    label: 'Task Completion',
    icon: CheckSquare,
    color: 'green',
    endpoint: '/reports/task-completion',
    component: TaskCompletionReport,
  },
  {
    id: 'revenue',
    label: 'Revenue Summary',
    icon: DollarSign,
    color: 'emerald',
    endpoint: '/reports/revenue',
    component: RevenueSummaryReport,
  },
];

const Reports = () => {
  const [activeReport, setActiveReport] = useState('employee-performance');
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const [reportData, setReportData] = useState({
    'employee-performance': null,
    'project-progress': null,
    'task-completion': null,
    revenue: null,
  });
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);
  const fetchingRef = useRef(false);

  const activeReportConfig = reportTypes.find((r) => r.id === activeReport);
  const ReportComponent = activeReportConfig?.component;
  const currentData = reportData[activeReport];

  const fetchReport = useCallback(
    async (reportId) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      const config = reportTypes.find((r) => r.id === reportId);
      if (!config) {
        fetchingRef.current = false;
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateRange.startDate)
          params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);

        const { data } = await axios.get(
          `${config.endpoint}?${params.toString()}`
        );

        setReportData((prev) => ({ ...prev, [reportId]: data.data }));
      } catch (error) {
        console.error(`Failed to fetch ${config.label}:`, error);
        toast.error(`Failed to load ${config.label}`);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [dateRange]
  );

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchReport(activeReport);
    }
  }, [activeReport, fetchReport]); // Empty dependency array - runs only once on mount

  useEffect(() => {
    if (initializedRef.current) {
      fetchReport(activeReport);
    }
  }, [dateRange.startDate, dateRange.endDate, activeReport, fetchReport]); // Only depend on date values

  const handleReportChange = (reportId) => {
    setActiveReport(reportId);
    fetchReport(reportId);
  };

  const handleDateChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleRefresh = () => {
    fetchReport(activeReport);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const response = await axios.post(
        '/reports/export',
        {
          type: activeReport,
          format: format,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      if (format === 'csv') {
        link.download = `${activeReport}-report.csv`;
      } else if (format === 'pdf') {
        link.download = `${activeReport}-report.pdf`;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate and export detailed business reports"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('csv')}
            icon={FileSpreadsheet}
            loading={exporting}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            icon={FileText}
            loading={exporting}
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            onClick={handleRefresh}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Date Range Filter */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                handleDateChange({ ...dateRange, startDate: e.target.value })
              }
              className="border rounded-lg text-sm px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                handleDateChange({ ...dateRange, endDate: e.target.value })
              }
              className="border rounded-lg text-sm px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
            />
            {(dateRange.startDate || dateRange.endDate) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDateChange({ startDate: '', endDate: '' })}
              >
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {reportTypes.map(({ id, label, icon: Icon, color }) => {
          const data = reportData[id];
          let recordInfo = '';
          if (data) {
            if (Array.isArray(data)) {
              recordInfo = `${data.length} records`;
            } else if (typeof data === 'object') {
              if (id === 'task-completion')
                recordInfo = `${data.totalTasks || 0} tasks`;
              else if (id === 'revenue')
                recordInfo = `$${(data.totalRevenue || 0).toLocaleString()}`;
            }
          }
          return (
            <button
              key={id}
              onClick={() => handleReportChange(id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                activeReport === id
                  ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20 shadow-md`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mb-3`}
              >
                <Icon
                  className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`}
                />
              </div>
              <p className="text-sm font-semibold">{label}</p>
              {recordInfo && (
                <p className="text-xs text-gray-500 mt-1">{recordInfo}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {activeReportConfig && (
                <activeReportConfig.icon className="w-5 h-5" />
              )}
              {activeReportConfig?.label} Report
            </CardTitle>
            {currentData && (
              <Badge variant="gray" size="sm">
                {Array.isArray(currentData)
                  ? `${currentData.length} records`
                  : 'Summary'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !currentData ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          ) : (
            ReportComponent && <ReportComponent data={currentData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
