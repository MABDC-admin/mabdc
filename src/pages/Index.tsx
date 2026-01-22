import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { EmployeesView } from '@/components/views/EmployeesView';
import { DeactivatedEmployeesView } from '@/components/views/DeactivatedEmployeesView';
import TimeShiftView from '@/components/views/TimeShiftView';
import TimeClockView from '@/components/views/TimeClockView';
import { EmployeePortalPreview } from '@/components/views/EmployeePortalPreview';
import { ContractsView } from '@/components/views/ContractsView';
import { RenewalView } from '@/components/views/RenewalView';
import { AttendanceView } from '@/components/views/AttendanceView';
import { EmployeeAttendanceView } from '@/components/views/EmployeeAttendanceView';
import { AttendanceAppealsView } from '@/components/views/AttendanceAppealsView';
import { LeaveView } from '@/components/views/LeaveView';
import { PayrollView } from '@/components/views/PayrollView';
import { EOSView } from '@/components/views/EOSView';
import { SettingsView } from '@/components/views/SettingsView';
import { CalendarPageView } from '@/components/views/CalendarPageView';
import { PerformanceView } from '@/components/views/PerformanceView';
import { DisciplineView } from '@/components/views/DisciplineView';
import { OrgChartView } from '@/components/views/OrgChartView';
import { CompanyDocsView } from '@/components/views/CompanyDocsView';
import { VisaProcessView } from '@/components/views/VisaProcessView';
import { ReportsView } from '@/components/views/ReportsView';
import { useHRStore } from '@/store/hrStore';

const Index = () => {
  const { currentView } = useHRStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'visa-process':
        return <VisaProcessView />;
      case 'employees':
        return <EmployeesView />;
      case 'deactivated':
        return <DeactivatedEmployeesView />;
      case 'time-shift':
        return <TimeShiftView />;
      case 'time-clock':
        return <TimeClockView />;
      case 'e-portal':
        return <EmployeePortalPreview />;
      case 'contracts':
        return <ContractsView />;
      case 'renewal':
        return <RenewalView />;
      case 'attendance':
        return <AttendanceView />;
      case 'employee-attendance':
        return <EmployeeAttendanceView />;
      case 'attendance-appeals':
        return <AttendanceAppealsView />;
      case 'leave':
        return <LeaveView />;
      case 'payroll':
        return <PayrollView />;
      case 'eos':
        return <EOSView />;
      case 'calendar':
        return <CalendarPageView />;
      case 'performance':
        return <PerformanceView />;
      case 'discipline':
        return <DisciplineView />;
      case 'orgchart':
        return <OrgChartView />;
      case 'company-docs':
        return <CompanyDocsView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
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
