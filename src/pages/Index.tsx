import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { EmployeesView } from '@/components/views/EmployeesView';
import { ContractsView } from '@/components/views/ContractsView';
import { AttendanceView } from '@/components/views/AttendanceView';
import { LeaveView } from '@/components/views/LeaveView';
import { PayrollView } from '@/components/views/PayrollView';
import { EOSView } from '@/components/views/EOSView';
import { useHRStore } from '@/store/hrStore';

const Index = () => {
  const { currentView } = useHRStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'employees':
        return <EmployeesView />;
      case 'contracts':
        return <ContractsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'leave':
        return <LeaveView />;
      case 'payroll':
        return <PayrollView />;
      case 'eos':
        return <EOSView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-16 lg:pt-6 overflow-x-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;
