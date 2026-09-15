/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/__tests__/index.test` | `/_sitemap`;
      DynamicRoutes: `/property/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/property/[id]`;
    }
  }
}
