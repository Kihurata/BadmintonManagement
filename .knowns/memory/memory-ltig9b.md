---
id: ltig9b
title: Validation Parser Backtick Bug
layer: project
category: pattern
tags:
  - validation
  - documentation
createdAt: '2026-05-24T09:04:26.701Z'
updatedAt: '2026-05-24T09:28:29.905Z'
---

The Knowns documentation validator has a bug where inline code blocks containing references (e.g. doc/path) followed immediately by punctuation (like . or ,) or closing backticks can have the backtick or punctuation parsed as part of the document path, resulting in BROKEN_DOC_REF warnings. Workaround: avoid wrapping active references in backticks, and ensure they are not immediately followed by punctuation (add a space or rewrite).
