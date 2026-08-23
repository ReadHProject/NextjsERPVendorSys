import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (rawApiUrl && !rawApiUrl.includes("localhost") && !rawApiUrl.includes("127.0.0.1") && !rawApiUrl.includes("onrender.com"))
  ? rawApiUrl
  : (typeof window !== "undefined" && (window.location.port === "3000" || window.location.port === "3001"))
    ? "http://localhost:5000/api/v1"
    : "/api/v1";

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const posApi = createApi({
  reducerPath: "posApi",
  baseQuery,
  tagTypes: ["POS"],
  endpoints: (builder) => ({
    searchProducts: builder.query({
      query: (q) => `/products?q=${encodeURIComponent(q)}&pageSize=20`,
      providesTags: ["POS"],
    }),
    createOrder: builder.mutation({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      invalidatesTags: ["POS"],
    }),
  }),
});

const { useSearchProductsQuery, useCreateOrderMutation } = posApi;
export default posApi;
export { useSearchProductsQuery, useCreateOrderMutation };
