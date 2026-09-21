// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; email: string },
  loading: false,
  magicLink: false,
}));
const sendMagicLink = vi.hoisted(() => vi.fn());
const completeEmailLink = vi.hoisted(() => vi.fn());

vi.mock("../lib/auth", () => ({
  useCurrentUser: () => authState,
  isMagicLink: () => authState.magicLink,
  sendMagicLink,
  completeEmailLink,
}));

describe("AuthGate", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    authState.magicLink = false;
    sendMagicLink.mockReset().mockResolvedValue(undefined);
    completeEmailLink.mockReset().mockResolvedValue(null);
    window.history.replaceState({}, "", "/");
  });

  afterEach(cleanup);

  it("asks an unauthenticated visitor what they want to do first", () => {
    render(<AuthGate><div>privado</div></AuthGate>);

    expect(screen.getByRole("button", { name: /crear un grupo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /unirme a un grupo/i })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("asks for email after choosing to create a group", () => {
    render(<AuthGate><div>privado</div></AuthGate>);

    fireEvent.click(screen.getByRole("button", { name: /crear un grupo/i }));

    expect(screen.getByRole("heading", { name: /crear un grupo/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /correo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enviar enlace para crear/i })).toBeTruthy();
  });

  it("normalizes the code and preserves the join intent in the email link", async () => {
    render(<AuthGate><div>privado</div></AuthGate>);
    fireEvent.click(screen.getByRole("button", { name: /unirme a un grupo/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /código del grupo/i }), {
      target: { value: "ab-cd e" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /correo/i }), {
      target: { value: "persona@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /enviar enlace para unirme/i }));

    await waitFor(() => expect(screen.getByText(/enlace enviado/i)).toBeTruthy());
    expect(sendMagicLink).toHaveBeenCalledWith(
      "persona@example.com",
      `${window.location.origin}/?entry=join&code=ABCDE`,
    );
  });

  it("asks for the email directly when a magic link was opened on another device", async () => {
    authState.magicLink = true;

    render(<AuthGate><div>privado</div></AuthGate>);

    expect(await screen.findByRole("heading", { name: /confirma tu correo/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /correo/i })).toBeTruthy();
  });

  it("renders private content for an authenticated user", () => {
    authState.user = { uid: "user-1", email: "user@example.com" };
    render(<AuthGate><div>privado</div></AuthGate>);
    expect(screen.getByText("privado")).toBeTruthy();
  });
});
