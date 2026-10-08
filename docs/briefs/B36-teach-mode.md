# B36 · Teach mode

**Stage 8 · ESS on the phone** · after: B35 · next: B37

## Goal

A new company's ESS, or a colleague's, needs no code: the person does a capability once in the
sealed browser with recording on, and code writes the recipe from what it saw. A model only names
what code can't place, and the person confirms that once.

## Read first

- `spec_v2.md` §13.1: *Teach mode*, all of it, and *Two kinds of step*.
- Decisions: D87 (the confirm-once pattern), D105, D106.
- B34's engine and recipe schema.

## Builds

### Recording
- **With recording on, in the sealed browser,** capture:
  - the requests and responses, by hooking `fetch`, `XMLHttpRequest` and form submissions inside the
    page
  - navigations, and the fields the person typed into, by label
  - file chooser events

### Writing the recipe (code)
- **Code knows what the person should be entering,** such as the claim's amount, date and files, or
  the salary's amount as net pay. It finds those values in what was typed and sent, and maps each
  field to its slot.
- **A token or id ESS handed out earlier** is found in an earlier response and chained.
- **A step that was a plain request** becomes `http`. Anything else becomes `page`, with its field's
  label and a fallback selector.
- **Only what code can't place,** such as a payslip's other lines, gets names drafted by a
  cheap-tier model. Code checks each one (the value must be where the name says), and the person
  confirms it once.
- **The recipe is saved as `draft`,** and becomes `active` when confirmed. Its first replay shows what
  it will send (B34).

## Done when

1. A recipe taught on the fake ESS, for *submit claims* and *fetch payslip*, replays correctly,
   including a chained CSRF token and one `page` step.
2. A model-named line that isn't where it claims to be is rejected by code.
3. No values are stored in the recipe (test).
