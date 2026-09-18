# mini-ruleset-b

A fictional base package (`minib`) that differs from `srd51` in the things the
engine must never hard-code: a different proficiency bonus table, a different
first-level hit point formula, full Hit Dice recovery on a long rest, six
skills instead of eighteen, three base actions and three conditions.

A character built on it must derive differently from the same character built
on `srd51` with zero engine code changes. That is the acceptance test of
ruleset switching (`docs/phase-0/07-ruleset-switching.md`, DEC-02).
