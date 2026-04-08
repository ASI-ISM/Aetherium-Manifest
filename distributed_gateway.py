"""Backward-compatible import shim for distributed gateway primitives.

This allows existing integrations/tests that import ``distributed_gateway`` from the
repository root to keep working while the implementation lives under
``api_gateway.distributed_gateway``.
"""

from api_gateway.distributed_gateway import *  # noqa: F401,F403
