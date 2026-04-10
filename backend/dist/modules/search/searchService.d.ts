export interface SearchQuery {
    q?: string;
    category?: string;
    subcategory?: string;
    condition?: 'new' | 'used';
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'relevance';
    page?: number;
    limit?: number;
}
export declare function searchListings(query: SearchQuery): Promise<{
    listings: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare function autocomplete(q: string): Promise<any[]>;
//# sourceMappingURL=searchService.d.ts.map