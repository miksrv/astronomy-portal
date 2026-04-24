---
name: CI4 BaseModel untyped properties
description: CI4's BaseModel declares $useTimestamps without a type — child models cannot add bool type hint
type: feedback
---

In CI4 4.7.2, `BaseModel::$useTimestamps` is declared as `protected $useTimestamps = false;` (no type hint). PHP 8 forbids a child class from re-declaring it with a type (`protected bool $useTimestamps`) because that would change the property type, which is a fatal error at class load time.

**Why:** Discovered during model audit — all models written with `protected bool $useTimestamps` caused a `PHP Fatal error: Type of App\Models\XXX::$useTimestamps must not be defined` error at runtime.

**How to apply:** Always write `protected $useTimestamps = true/false;` without the `bool` type hint in any model that extends `ApplicationBaseModel` or CI4's `Model`/`BaseModel`. This applies to any other property CI4 declares without a type in BaseModel — check before adding PHP 8 type hints.
