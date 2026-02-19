// src/utils/withQuery.ts

export function withQuery(
    endpoint: string,
    params: Record<string, string | number | boolean | null | undefined>
  ): string {
    const searchParams = new URLSearchParams();
  
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
  
    const query = searchParams.toString();
    return query ? `${endpoint}?${query}` : endpoint;
  }
  