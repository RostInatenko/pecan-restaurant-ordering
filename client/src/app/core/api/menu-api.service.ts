import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Category, CategoryInput, MenuItem, MenuItemInput } from '@pecan/shared';
import type { Observable } from 'rxjs';

/**
 * Commands only. Responses are not written to the store: the change comes back over the
 * WebSocket like everyone else's, so the store has a single, ordered source.
 */
@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly http = inject(HttpClient);

  createCategory(input: CategoryInput): Observable<Category> {
    return this.http.post<Category>('/api/categories', input);
  }

  updateCategory(id: string, patch: Partial<CategoryInput>): Observable<Category> {
    return this.http.patch<Category>(`/api/categories/${encodeURIComponent(id)}`, patch);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`/api/categories/${encodeURIComponent(id)}`);
  }

  createItem(input: MenuItemInput): Observable<MenuItem> {
    return this.http.post<MenuItem>('/api/items', input);
  }

  updateItem(id: string, patch: Partial<MenuItemInput>): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`/api/items/${encodeURIComponent(id)}`, patch);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`/api/items/${encodeURIComponent(id)}`);
  }
}
