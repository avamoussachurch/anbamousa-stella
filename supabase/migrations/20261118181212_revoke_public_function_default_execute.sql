-- PostgreSQL grants EXECUTE on new functions to PUBLIC unless the global default is revoked.
ALTER DEFAULT PRIVILEGES
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Keep existing public-schema trigger/internal functions off the exposed RPC surface.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
