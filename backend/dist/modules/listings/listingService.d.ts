import { z } from 'zod';
export declare const createListingSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    price: z.ZodNumber;
    category: z.ZodString;
    subcategory: z.ZodString;
    condition: z.ZodEnum<["new", "used"]>;
    location: z.ZodObject<{
        city: z.ZodString;
        region: z.ZodString;
        coordinates: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"Point">;
            coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        }, "strip", z.ZodTypeAny, {
            type: "Point";
            coordinates: [number, number];
        }, {
            type: "Point";
            coordinates: [number, number];
        }>>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    }, {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    }>;
    images: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        original: z.ZodString;
        thumbnail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        original: string;
        thumbnail: string;
    }, {
        original: string;
        thumbnail: string;
    }>, "many">>>;
    expiresAt: z.ZodOptional<z.ZodDate>;
    isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    price: number;
    category: string;
    subcategory: string;
    condition: "new" | "used";
    location: {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    };
    images: {
        original: string;
        thumbnail: string;
    }[];
    isFeatured: boolean;
    expiresAt?: Date | undefined;
}, {
    title: string;
    description: string;
    price: number;
    category: string;
    subcategory: string;
    condition: "new" | "used";
    location: {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    };
    images?: {
        original: string;
        thumbnail: string;
    }[] | undefined;
    expiresAt?: Date | undefined;
    isFeatured?: boolean | undefined;
}>;
export declare const updateListingSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodEnum<["new", "used"]>>;
    location: z.ZodOptional<z.ZodObject<{
        city: z.ZodString;
        region: z.ZodString;
        coordinates: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"Point">;
            coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        }, "strip", z.ZodTypeAny, {
            type: "Point";
            coordinates: [number, number];
        }, {
            type: "Point";
            coordinates: [number, number];
        }>>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    }, {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    }>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        original: z.ZodString;
        thumbnail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        original: string;
        thumbnail: string;
    }, {
        original: string;
        thumbnail: string;
    }>, "many">>>>;
    expiresAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    price?: number | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    condition?: "new" | "used" | undefined;
    location?: {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    } | undefined;
    images?: {
        original: string;
        thumbnail: string;
    }[] | undefined;
    expiresAt?: Date | undefined;
    isFeatured?: boolean | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    price?: number | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    condition?: "new" | "used" | undefined;
    location?: {
        city: string;
        region: string;
        coordinates?: {
            type: "Point";
            coordinates: [number, number];
        } | undefined;
    } | undefined;
    images?: {
        original: string;
        thumbnail: string;
    }[] | undefined;
    expiresAt?: Date | undefined;
    isFeatured?: boolean | undefined;
}>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
type ListingStatus = 'draft' | 'published' | 'sold' | 'archived';
export declare function canTransition(from: ListingStatus, to: ListingStatus, isAdmin: boolean): boolean;
export declare function createListing(sellerId: string, data: CreateListingInput): Promise<any>;
export declare function updateListing(listingId: string, sellerId: string, data: UpdateListingInput, isAdmin: boolean): Promise<any>;
export declare function deleteListing(listingId: string, sellerId: string): Promise<void>;
export declare function getMyListings(sellerId: string): Promise<any[]>;
export declare function publishListing(listingId: string, sellerId: string): Promise<any>;
export declare function markSold(listingId: string, sellerId: string): Promise<any>;
export declare function getPublicFeed(page: number, limit: number): Promise<{
    listings: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare function getListingById(id: string): Promise<any>;
export {};
//# sourceMappingURL=listingService.d.ts.map