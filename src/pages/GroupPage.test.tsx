// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Group } from "../types";
import { GroupPage } from "./GroupPage";

const getFullGroup = vi.hoisted(() => vi.fn());
const recordDebtPayment = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
}));

vi.mock("../lib/db", () => ({
  addDebt: vi.fn(),
  addMember: vi.fn(),
  getFullGroup,
  recordDebtPayment,
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
    recordDebtPayment.mockReset().mockResolvedValue(undefined);
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

    expect(
      await screen.findByRole("button", { name: "Registrar pago" }),
    ).toBeTruthy();
  });

  it("lets the lender register a partial payment and shows the remaining balance", async () => {
    authState.user = { uid: "lender-user" };
    const initialGroup = {
      ...group,
      members: [group.members[0], { ...group.members[1], userId: "lender-user" }],
    };
    const partiallyPaidGroup = {
      ...initialGroup,
      debts: [
        {
          ...group.debts[0],
          status: "parcial" as const,
          paidAmount: 1500,
        },
      ],
    };
    getFullGroup
      .mockReset()
      .mockResolvedValueOnce(initialGroup)
      .mockResolvedValueOnce(initialGroup)
      .mockResolvedValue(partiallyPaidGroup);

    renderGroupPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pago" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Registrar pago",
    });
    const amountInput = within(dialog).getByLabelText("Monto recibido");
    expect((amountInput as HTMLInputElement).value).toBe("4560");
    fireEvent.change(amountInput, { target: { value: "1500" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    await waitFor(() =>
      expect(recordDebtPayment).toHaveBeenCalledWith(
        "group-1",
        "debt-1",
        1500,
      ),
    );
    await waitFor(() => {
      const debtCard = screen
        .getByText("CODEX SEPTIEMBRE")
        .closest(".group-dashboard-debt-card");
      expect(debtCard).toBeTruthy();
      expect(
        within(debtCard as HTMLElement).getByText(/3(?:[.\s\u00a0])060/),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeTruthy();
  });

  it("shows the signed-in member's total debt and amounts owed to each person", async () => {
    authState.user = { uid: "debtor-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        { ...group.members[0], userId: "debtor-user" },
        group.members[1],
        { id: "maria", name: "Maria", email: null, avatar: "", joinedAt: "" },
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "debt-2",
          amount: 2000,
          paidAmount: 500,
          status: "parcial",
          reason: "Supermercado",
        },
        {
          ...group.debts[0],
          id: "debt-3",
          lenderId: "maria",
          amount: 12,
          paidAmount: 0,
          currency: "USD",
          reason: "Taxi",
        },
        {
          ...group.debts[0],
          id: "debt-paid",
          lenderId: "maria",
          amount: 9000,
          paidAmount: 9000,
          status: "pagada",
        },
        {
          ...group.debts[0],
          id: "debt-reverse",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 3000,
        },
      ],
    });

    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "Mi deuda" }));

    const dialog = await screen.findByRole("dialog", { name: "Mi deuda" });
    const totals = within(dialog).getByLabelText("Total pendiente");
    expect(within(totals).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    expect(within(totals).getByText(/12 USD/)).toBeTruthy();

    const alvaroDebt = within(dialog).getByLabelText("Deuda con Alvaro");
    expect(within(alvaroDebt).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    const mariaDebt = within(dialog).getByLabelText("Deuda con Maria");
    expect(within(mariaDebt).getByText(/12 USD/)).toBeTruthy();
    expect(within(dialog).queryByText(/9(?:[.\s\u00a0])000/)).toBeNull();
    expect(within(dialog).queryByText(/3(?:[.\s\u00a0])000/)).toBeNull();
  });

  it("shows how much the signed-in member is owed by each debtor", async () => {
    authState.user = { uid: "lender-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        group.members[0],
        { ...group.members[1], userId: "lender-user" },
        { id: "maria", name: "Maria", email: null, avatar: "", joinedAt: "" },
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "debt-2",
          amount: 2000,
          paidAmount: 500,
          status: "parcial",
          reason: "Supermercado",
        },
        {
          ...group.debts[0],
          id: "debt-3",
          debtorId: "maria",
          amount: 12,
          paidAmount: 0,
          currency: "USD",
          reason: "Taxi",
        },
        {
          ...group.debts[0],
          id: "debt-paid",
          debtorId: "maria",
          amount: 9000,
          paidAmount: 9000,
          status: "pagada",
        },
        {
          ...group.debts[0],
          id: "debt-reverse",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 3000,
        },
      ],
    });

    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "Me deben" }));

    const dialog = await screen.findByRole("dialog", { name: "Me deben" });
    const totals = within(dialog).getByLabelText("Total por cobrar");
    expect(within(totals).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    expect(within(totals).getByText(/12 USD/)).toBeTruthy();

    const andersDebt = within(dialog).getByLabelText("Deuda de Anders1");
    expect(within(andersDebt).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    const mariaDebt = within(dialog).getByLabelText("Deuda de Maria");
    expect(within(mariaDebt).getByText(/12 USD/)).toBeTruthy();
    expect(within(dialog).queryByText(/9(?:[.\s\u00a0])000/)).toBeNull();
    expect(within(dialog).queryByText(/3(?:[.\s\u00a0])000/)).toBeNull();
  });

  it("compares and compensates mutual debt in the selected currency", async () => {
    getFullGroup.mockResolvedValue({
      ...group,
      debts: [
        ...group.debts,
        {
          ...group.debts[0],
          id: "debt-2",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 1000,
          reason: "Taxi",
          createdAt: "2026-10-10T22:00:00.000Z",
        },
      ],
    });
    renderGroupPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Buscar deuda" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Buscar deuda" });
    expect(within(dialog).getByText("Comparar deuda")).toBeTruthy();

    const selects = within(dialog).getAllByRole("combobox");
    fireEvent.change(selects[2], { target: { value: "debtor" } });
    fireEvent.change(selects[3], { target: { value: "lender" } });
    fireEvent.change(selects[4], { target: { value: "CRC" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Comparar" }));

    expect(within(dialog).getByText("Anders1 debe a Alvaro")).toBeTruthy();
    expect(within(dialog).getByText(/3(?:[.\s\u00a0])560/)).toBeTruthy();
  });
});
