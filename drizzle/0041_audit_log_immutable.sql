-- Audit log immutability: prevent UPDATE and DELETE on audit_log
CREATE TRIGGER IF NOT EXISTS `audit_log_no_update` BEFORE UPDATE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'Audit log entries cannot be modified');
END;

CREATE TRIGGER IF NOT EXISTS `audit_log_no_delete` BEFORE DELETE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'Audit log entries cannot be deleted');
END;
