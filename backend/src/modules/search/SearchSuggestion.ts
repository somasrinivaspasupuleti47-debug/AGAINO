import { Document, Schema, Model, model } from 'mongoose';

export interface ISearchSuggestion extends Document {
  text: string;
}

const SearchSuggestionSchema = new Schema<ISearchSuggestion>({
  text: { type: String, required: true, unique: true },
});

SearchSuggestionSchema.index({ text: 'text' });

export const SearchSuggestion: Model<ISearchSuggestion> = model<ISearchSuggestion>(
  'SearchSuggestion',
  SearchSuggestionSchema,
  'search_suggestions',
);
