// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Group } from "../types";
import { GroupPage } from "./GroupPage";

const getFullGroup = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
}));

vi.mock("../lib/db", () => ({
  addDebt: vi.fn(),
  addMember: vi.fn(),
  getFullGroup,
  markDebtPaid: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  useCurrentUser: () => ({ user: authState.user }),
  signOut: vi.fn(),
}));

const group: Group = {
  id: "group-1",
  ownerId: "owner-1",
  name: "Viaje",
  type: "amigos",
  members: [
    { id: "debtor", name: "Anders1", email: null, avatar: "", joinedAt: "" },
    { id: "lender", name: "Alvaro", email: null, avatar: "", joinedAt: "" },
  ],
  debts: [
    {
      id: "debt-1",
      debtorId: "debtor",
      lenderId: "lender",
      amount: 4560,
      currency: "CRC",
      reason: "CODEX SEPTIEMBRE",
      date: "2026-10-10",
      status: "pendiente",
      paidAmount: 0,
      createdAt: "2026-10-10T21:45:00.000Z",
    },
  ],
  createdAt: "2026-10-01T00:00:00.000Z",
  accessCode: "ABCDE",
};

function renderGroupPage() {
  return render(
    <MemoryRouter initialEntries={["/group/group-1"]}>
      <Routes>
        <Route path="/group/:id" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GroupPage debt cards", () => {
  beforeEach(() => {
    authState.user = null;
    group.members[0].userId = undefined;
    group.members[1].userId = undefined;
    getFullGroup.mockReset();
    getFullGroup.mockResolvedValue(group);
  });

  afterEach(cleanup);

  it("shows createdAt immediately below the debt reason", async () => {
    renderGroupPage();

    const reason = await screen.findByText("CODEX SEPTIEMBRE");
    const createdAt = screen.getByText("10 oct 2026, 3:45 p. m.");

    expect(reason.nextElementSibling).toBe(createdAt);
  });

  it("shows the app version in the footer", async () => {
    renderGroupPage();

    const footer = await screen.findByRole("contentinfo", { name: /versión/i });
    expect(footer.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("does not let the debtor confirm their own payment", async () => {
    authState.user = { uid: "debtor-user" };
    group.members[0].userId = "debtor-user";

    renderGroupPage();

    expect(await screen.findByText("Solo Alvaro confirma")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pagar ✓" })).toBeNull();
  });

  it("lets the lender confirm the payment", async () => {
    authState.user = { uid: "lender-user" };
    group.members[1].userId = "lender-user";

    renderGroupPage();

    expect(await screen.findByRole("button", { name: "Pagar ✓" })).toBeTruthy();
  });
});
