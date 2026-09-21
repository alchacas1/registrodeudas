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
const joinGroupWithCredentials = vi.hoisted(() => vi.fn());

vi.mock("../lib/auth", () => ({
  useCurrentUser: () => authState,
  isMagicLink: () => authState.magicLink,
  sendMagicLink,
  completeEmailLink,
  joinGroupWithCredentials,
}));

describe("AuthGate", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    authState.magicLink = false;
    sendMagicLink.mockReset().mockResolvedValue(undefined);
    completeEmailLink.mockReset().mockResolvedValue(null);
    joinGroupWithCredentials.mockReset().mockResolvedValue({ groupId: "group-1" });
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

  it("authenticates a join directly and prepares the matched group route", async () => {
    render(<AuthGate><div>privado</div></AuthGate>);
    fireEvent.click(screen.getByRole("button", { name: /unirme a un grupo/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /código del grupo/i }), {
      target: { value: "ab-cd e" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /correo/i }), {
      target: { value: "persona@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /ingresar al grupo/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/group/group-1"));
    expect(joinGroupWithCredentials).toHaveBeenCalledWith("ABCDE", "persona@example.com");
    expect(sendMagicLink).not.toHaveBeenCalled();
    expect(screen.queryByText(/enlace enviado/i)).toBeNull();
  });

  it("shows one generic message when the code and email do not match", async () => {
    joinGroupWithCredentials.mockRejectedValue({ kind: "invalid" });
    render(<AuthGate><div>privado</div></AuthGate>);
    fireEvent.click(screen.getByRole("button", { name: /unirme a un grupo/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /código del grupo/i }), {
      target: { value: "ABCDE" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /correo/i }), {
      target: { value: "persona@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /ingresar al grupo/i }));

    expect((await screen.findByRole("alert")).textContent).toBe("No se pudo ingresar con esos datos.");
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
