export function createNeonAuth() {
  return {
    handler: () => {},
    api: {},
  };
}

export async function getServerSession() {
  return { user: null, session: null };
}
