"use client";

import type { Route } from "next";
import Link from "next/link";
import type { UrlObject } from "node:url";
import { useQueryStates } from "nuqs";
import type { ComponentProps } from "react";

import { dashboardSearchParsers, serializeDashboardParams } from "@/lib/search-params";

type PersistParamsLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string | UrlObject;
};

export function PersistParamsLink({ href, ...restProps }: PersistParamsLinkProps) {
  const [params] = useQueryStates(dashboardSearchParsers);

  if (typeof href === "object") {
    return <Link {...restProps} href={href} />;
  }

  return <Link {...restProps} href={serializeDashboardParams(href, params) as Route} />;
}
