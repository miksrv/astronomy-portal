import { configureStore } from '@reduxjs/toolkit'
import { api } from "@/api/api";
import authSlice from './authSlice'
import sidebarSlice from "@/components/sidebar/sidebarSlice";
import { createWrapper } from "next-redux-wrapper";
import loginFormSlice from "@/components/login-form/loginFormSlice";

export const store = () =>
    configureStore({
        reducer: {
            auth: authSlice,
            sidebar: sidebarSlice,
            loginForm: loginFormSlice,

            [api.reducerPath]: api.reducer
        },
        middleware: (gDM) => gDM().concat(api.middleware),
    });

export type AppStore = ReturnType<typeof store>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const wrapper = createWrapper<AppStore>(store, { debug: true });
