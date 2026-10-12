import 'package:flutter_test/flutter_test.dart';
import 'package:rasikh/domain/maintenance.dart';

// Same fixtures as packages/shared/src/maintenance.test.ts.
void main() {
  test('suggested responsibility', () {
    expect(suggestResponsibility('consumables'), 'tenant');
    expect(suggestResponsibility('tenant_damage'), 'tenant');
    for (final c in [
      'plumbing',
      'electrical',
      'ac',
      'appliance',
      'structure',
      'pest',
      'other',
    ]) {
      expect(suggestResponsibility(c), 'owner');
    }
  });

  group('SLA', () {
    const created = '2026-10-12T08:00:00.000Z';
    test('ok, due soon, breached', () {
      expect(
        slaState('urgent', created, '2026-10-12T10:00:00.000Z'),
        SlaState.ok,
      );
      expect(
        slaState('urgent', created, '2026-10-13T03:00:00.000Z'),
        SlaState.dueSoon,
      );
      expect(
        slaState('urgent', created, '2026-10-13T09:00:00.000Z'),
        SlaState.breached,
      );
    });
    test('a resolved ticket is judged by its resolution time', () {
      expect(
        slaState(
          'urgent',
          created,
          '2027-01-01T00:00:00.000Z',
          '2026-10-13T07:00:00.000Z',
        ),
        SlaState.met,
      );
      expect(
        slaState(
          'urgent',
          created,
          '2027-01-01T00:00:00.000Z',
          '2026-10-13T09:00:00.000Z',
        ),
        SlaState.breached,
      );
    });
  });

  test('status machine', () {
    expect(nextStatus('open', 'assign', 'staff'), 'assigned');
    expect(nextStatus('assigned', 'start', 'staff'), 'in_progress');
    expect(nextStatus('in_progress', 'resolve', 'staff'), 'resolved');
    expect(nextStatus('resolved', 'close', 'tenant'), 'closed');
    expect(nextStatus('open', 'assign', 'tenant'), isNull);
    expect(nextStatus('closed', 'cancel', 'staff'), isNull);
    expect(nextStatus('in_progress', 'cancel', 'tenant'), isNull);
    expect(nextStatus('assigned', 'assign', 'staff'), 'assigned');
  });
}
