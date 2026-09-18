# invalid

Deliberately broken packages. Each directory holds an otherwise valid package
with exactly one defect and an `expected-diagnostics.yaml` listing the codes
`dnd validate` must report for it, and nothing else. Used by the CLI tests.
