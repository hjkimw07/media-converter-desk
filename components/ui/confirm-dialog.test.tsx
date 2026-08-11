import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      confirmLabel="전체 삭제"
      description="되돌릴 수 없습니다."
      destructive
      open
      title="소스 큐를 전체 삭제할까요?"
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("닫혀 있으면 아무것도 그리지 않아야 한다", () => {
    renderDialog({ open: false });

    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("제목과 설명을 alertdialog로 노출해야 한다", () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog");

    expect(dialog).toHaveAccessibleName("소스 큐를 전체 삭제할까요?");
    expect(dialog).toHaveAccessibleDescription("되돌릴 수 없습니다.");
  });

  it("열릴 때 취소 버튼에 포커스를 둬 실수 확인을 막아야 한다", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
  });

  it("확인을 누르면 onConfirm을 호출해야 한다", () => {
    const { onConfirm, onCancel } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("취소·배경 클릭·Escape 모두 onCancel을 호출해야 한다", () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: "다이얼로그 닫기" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
