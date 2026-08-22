import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (rawApiUrl && !rawApiUrl.includes("onrender.com"))
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

const suppliersApi = createApi({
  reducerPath: "suppliersApi",
  baseQuery,
  tagTypes: ["Supplier"],
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: ({ page = 1, pageSize = 20, q } = {}) => {
        let url = `/suppliers?page=${page}&pageSize=${pageSize}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        return url;
      },
      providesTags: ["Supplier"],
    }),
    getSupplier: builder.query({
      query: (id) => `/suppliers/${id}`,
      providesTags: ["Supplier"],
    }),
    createSupplier: builder.mutation({
      query: (body) => ({ url: "/suppliers", method: "POST", body }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: "PUT", body }),
      invalidatesTags: ["Supplier"],
    }),
    deleteSupplier: builder.mutation({
      query: (id) => ({ url: `/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Supplier"],
    }),
  }),
});

const { useGetSuppliersQuery, useGetSupplierQuery, useCreateSupplierMutation, useUpdateSupplierMutation, useDeleteSupplierMutation } = suppliersApi;
export default suppliersApi;
export {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
};
