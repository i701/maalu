import Link, { type LinkProps } from "@mui/material/Link";
import ListItemButton, { type ListItemButtonProps } from "@mui/material/ListItemButton";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

// MUI components wrapped with TanStack Router's createLink: typed routes, preloading, no full reloads.
const MuiLinkAnchor = forwardRef<HTMLAnchorElement, Omit<LinkProps, "href">>((props, ref) => (
	<Link ref={ref} {...props} />
));
export const RouterLink = createLink(MuiLinkAnchor);

const NavAnchor = forwardRef<HTMLAnchorElement, ListItemButtonProps<"a">>((props, ref) => (
	<ListItemButton ref={ref} component="a" {...props} />
));
export const NavLink = createLink(NavAnchor);
