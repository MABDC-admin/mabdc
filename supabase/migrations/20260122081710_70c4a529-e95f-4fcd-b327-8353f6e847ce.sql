-- Deactivate unused leave types
UPDATE leave_types SET is_active = false WHERE code IN ('BEREAVEMENT', 'HAJJ', 'SICK_HALF', 'SICK_UNPAID', 'STUDY', 'UNPAID');

-- Rename Sick Leave (Full Pay) to just "Sick Leave"
UPDATE leave_types SET name = 'Sick Leave', code = 'SICK' WHERE code = 'SICK_FULL';