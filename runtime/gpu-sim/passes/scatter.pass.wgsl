// Staged compute pass placeholder for GPU simulation pipeline.
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  _ = gid;
}
