// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const state = vi.hoisted(() => ({ user: null as null | { uid: string; email: string }, loading: false }));
vi.mock("../lib/auth", () => ({
  useCurrentUser: () => state,
  isMagicLink: () => false,
  sendMagicLink: vi.fn(),
  completeEmailLink: vi.fn(),
}));

describe("AuthGate", () => {
  beforeEach(() => { state.user = null; state.loading = false; });
  it("asks an unauthenticated visitor for email", () => {
    render(<AuthGate><div>privado</div></AuthGate>);
    expect(screen.getByRole("textbox", { name: /correo/i })).toBeTruthy();
    expect(screen.queryByText("privado")).toBeNull();
  });
  it("renders private content for an authenticated user", () => {
    state.user = { uid: "user-1", email: "user@example.com" };
    render(<AuthGate><div>privado</div></AuthGate>);
    expect(screen.getByText("privado")).toBeTruthy();
  });
});
