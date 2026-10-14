# Escapes

Every bug the owner finds by hand that QA passed (D137). Each entry says why QA missed it, the pin
that now catches it, and the question the eyes pass asks on every changed screen so its *kind* isn't
missed again. The main session adds an entry whenever the owner reports one, before fixing it.

`qa-eyes` reads the **Ask** line of every entry and adds it to its fixed questions.

| # | Found | What the owner saw | Why QA missed it | Pin | Ask |
|---|---|---|---|---|---|
| E1 | 12 Oct, phone, after B04 | Every screen felt dense and overwhelming, even ones with a few lines (*Receipts by email*): nearly all text 16 px, section headings 14 px and grey, every chip and button drawn a full 48 px (D129). Then most screens read as plain lists where facts and actions look alike (D130) | QA checked what passes or fails (axe, 48 px targets, journeys end where they should), never how a screen feels to read. Nobody looked at a screen as a person would, and density has no rule to fail | `redesign-pins.spec.ts` (D129's sizes, D130's cards); the catalogue's trees and pixels show any screen that changes | Is it calm or crowded: one thing to look at first, room between groups, every heading bigger than what it heads, facts and actions looking different? |
