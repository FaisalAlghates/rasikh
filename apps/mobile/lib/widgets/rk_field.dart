import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/rasikh_tokens.g.dart';

/// Text field with label, hint and error (the error is announced to screen readers).
class RkField extends StatelessWidget {
  const RkField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.error,
    this.keyboardType,
    this.obscureText = false,
    this.ltr = false,
    this.onChanged,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final String? error;
  final TextInputType? keyboardType;
  final bool obscureText;

  /// Force left-to-right input (emails, phone numbers, codes).
  final bool ltr;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      textDirection: ltr ? TextDirection.ltr : null,
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        helperText: error == null ? hint : null,
        errorText: error,
        errorStyle: TextStyle(color: context.tokens.danger),
      ),
    );
  }
}

/// Date entered as YYYY-MM-DD (always left-to-right), with a calendar button for picking.
class RkDateField extends StatelessWidget {
  const RkDateField({
    super.key,
    required this.label,
    required this.controller,
    required this.pickerLabel,
    this.error,
    this.onChanged,
  });
  final String label, pickerLabel;
  final TextEditingController controller;
  final String? error;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textDirection: TextDirection.ltr,
      keyboardType: TextInputType.datetime,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        hintText: '2026-01-31',
        errorText: error,
        errorStyle: TextStyle(color: context.tokens.danger),
        suffixIcon: IconButton(
          tooltip: pickerLabel,
          icon: const Icon(Icons.calendar_today_outlined, size: 20),
          onPressed: () async {
            final now = DateTime.now();
            final current = DateTime.tryParse(controller.text.trim());
            final picked = await showDatePicker(
              context: context,
              initialDate: current ?? now,
              firstDate: DateTime(now.year - 5),
              lastDate: DateTime(now.year + 15),
            );
            if (picked == null) return;
            final text =
                '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
            controller.text = text;
            onChanged?.call(text);
          },
        ),
      ),
    );
  }
}

class RkSelectOption<T> {
  const RkSelectOption(this.value, this.label);
  final T value;
  final String label;
}

class RkSelect<T> extends StatelessWidget {
  const RkSelect({
    super.key,
    required this.label,
    required this.options,
    required this.onChanged,
    this.value,
    this.placeholder,
  });

  final String label;
  final String? placeholder;
  final List<RkSelectOption<T>> options;
  final T? value;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      label: label,
      child: DropdownButtonFormField<T>(
        initialValue: value,
        isExpanded: true,
        hint: placeholder == null
            ? null
            : Text(placeholder!, style: TextStyle(color: t.textMuted)),
        decoration: InputDecoration(labelText: label),
        borderRadius: BorderRadius.circular(RasikhTokens.radiusMd),
        dropdownColor: t.surface,
        items: [
          for (final o in options)
            DropdownMenuItem(value: o.value, child: Text(o.label)),
        ],
        onChanged: onChanged,
      ),
    );
  }
}
