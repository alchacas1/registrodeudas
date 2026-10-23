// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Home } from "./Home";

const createGroup = vi.hoisted(() => vi.fn());
const findGroupByCode = vi.hoisted(() => vi.fn());
const listMyGroups = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  user: { uid: "user-1", email: "persona@example.com", emailVerified: true },
  loading: false,
  groupSession: false,
}));

vi.mock("../lib/db", () => ({
  createGroup,
  findGroupByCode,
  listMyGroups,
}));
vi.mock("../lib/auth", () => ({
  useCurrentUser: () => authState,
  signOut,
}));

function renderHome(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/group/:id" element={<div>Grupo abierto</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Home entry flow", () => {
  beforeEach(() => {
    createGroup.mockReset();
    findGroupByCode.mockReset();
    listMyGroups.mockReset().mockResolvedValue([]);
    signOut.mockReset().mockResolvedValue(undefined);
    authState.groupSession = false;
  });

  afterEach(cleanup);

  it("shows only the action selector when there is no resumed intent", () => {
    renderHome();

    expect(screen.getByRole("button", { name: /crear un grupo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /unirme a un grupo/i })).toBeTruthy();
    expect(screen.queryByPlaceholderText(/nombre del grupo/i)).toBeNull();
    expect(screen.queryByLabelText(/código del grupo/i)).toBeNull();
  });

  it("shows every group for the authenticated account and opens the selected one", async () => {
    listMyGroups.mockResolvedValue([
      { id: "group-1", name: "Viaje", type: "amigos", description: "Octubre", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "group-2", name: "Casa", type: "familia", createdAt: "2026-09-01T00:00:00.000Z" },
    ]);

    renderHome();

    expect(await screen.findByRole("heading", { name: /mis grupos/i })).toBeTruthy();
    expect(screen.getByText("Viaje")).toBeTruthy();
    expect(screen.getByText("Casa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /abrir grupo viaje/i }));
    expect(await screen.findByText("Grupo abierto")).toBeTruthy();
  });

  it("shows the app version in the footer", () => {
    renderHome();

    const footer = screen.getByRole("contentinfo", { name: /versión/i });
    expect(footer.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("shows the authenticated account and a sign-out action", () => {
    renderHome();

    expect(screen.getByText("persona@example.com")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("resumes directly in the create form after authentication", () => {
    renderHome("/?entry=create");

    expect(screen.getByRole("heading", { name: /crear grupo/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/nombre del grupo/i)).toBeTruthy();
    expect(screen.queryByLabelText(/código del grupo/i)).toBeNull();
  });

  it("signs out a restricted group session before offering another group action", async () => {
    authState.groupSession = true;

    renderHome();

    expect(screen.getByText(/preparando el acceso/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /crear un grupo/i })).toBeNull();
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(createGroup).not.toHaveBeenCalled();
    expect(findGroupByCode).not.toHaveBeenCalled();
  });

  it("keeps the code and explains when the authenticated email was not invited", async () => {
    findGroupByCode.mockResolvedValue({ status: "not-invited" });
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /unirme a un grupo/i }));
    const codeInput = screen.getByLabelText(/código del grupo/i);
    fireEvent.change(codeInput, { target: { value: "abcde" } });

    fireEvent.click(screen.getByRole("button", { name: /^unirme$/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/correo todavía no pertenece/i);
    expect((codeInput as HTMLInputElement).value).toBe("ABCDE");
  });

  it("automatically opens an authorized group from a resumed join intent", async () => {
    findGroupByCode.mockResolvedValue({ status: "joined", id: "group-1" });

    renderHome("/?entry=join&code=ABCDE");

    await waitFor(() => expect(screen.getByText("Grupo abierto")).toBeTruthy());
    expect(findGroupByCode).toHaveBeenCalledWith("ABCDE");
  });
});
