import { EmployeeAttendanceCalendar } from '@/components/attendance/EmployeeAttendanceCalendar';
import { useHRStore } from '@/store/hrStore';

export function EmployeeAttendanceView() {
  const { setCurrentView } = useHRStore();

  return (
    <EmployeeAttendanceCalendar
      showEmployeeSelector={true}
      showBackButton={true}
      onBack={() => setCurrentView('attendance')}
    />
  );
}
