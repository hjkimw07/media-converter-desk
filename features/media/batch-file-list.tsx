"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Files,
  Folder,
  GripVertical,
  Minus,
  SquareMinus,
  Trash2,
} from "lucide-react";
import type { UploadedMedia } from "@/types/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getFileRelativePath } from "@/lib/media/archive";
import { groupMediaByFolder, type MediaFolderGroup } from "@/lib/media/folders";
import { formatBytes } from "@/lib/media/format";
import type { ReorderPlacement } from "@/lib/media/reorder";
import { cn } from "@/lib/utils";

type BatchFileListProps = {
  items: UploadedMedia[];
  selectedId?: string;
  checkedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleChecked: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** 소스 큐 전체 비우기. 선택 액션 옆에 함께 놓습니다. */
  onClearAll?: () => void;
  onReorder: (sourceId: string, targetId: string, placement?: ReorderPlacement) => void;
  onReorderGroup?: (sourceGroupKey: string, targetGroupKey: string, placement?: ReorderPlacement) => void;
  onRename?: (id: string, name: string) => void;
  onRenameFolder?: (folderKey: string, name: string) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveFolder: (folderKey: string) => void;
};

export function BatchFileList({
  items,
  selectedId,
  checkedIds,
  onSelect,
  onToggleChecked,
  onToggleAll,
  onClearAll,
  onReorder,
  onReorderGroup,
  onRename,
  onRenameFolder,
  onDownload,
  onRemove,
  onRemoveFolder,
}: BatchFileListProps) {
  const [draggingId, setDraggingId] = useState<string>();
  const [draggingGroupKey, setDraggingGroupKey] = useState<string>();
  const [itemDropTarget, setItemDropTarget] = useState<DropTarget>();
  const [groupDropTarget, setGroupDropTarget] = useState<DropTarget>();
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string>();
  const [editingName, setEditingName] = useState("");
  const [editingFolderKey, setEditingFolderKey] = useState<string>();
  const [editingFolderName, setEditingFolderName] = useState("");

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm leading-6 text-muted-foreground">
        업로드한 파일과 폴더 항목이 여기에 표시됩니다. 항목이 많아지면 이 영역에서 스크롤됩니다.
      </div>
    );
  }

  const selectedVisibleCount = items.filter((item) => checkedIds.has(item.id)).length;
  const allChecked = items.length > 0 && selectedVisibleCount === items.length;
  const groups = groupMediaByFolder(items);
  const shouldShowGroupHeaders = groups.length > 1 || groups.some((group) => group.isFolder);
  const areAllGroupsCollapsed = groups.length > 0 && groups.every((group) => collapsedGroupKeys.has(group.key));
  const toggleAllGroups = () => {
    // 접을 때 키를 새로 만들어, 사라진 그룹의 잔여 키가 쌓이지 않게 합니다.
    setCollapsedGroupKeys(areAllGroupsCollapsed ? new Set() : new Set(groups.map((group) => group.key)));
  };
  const startRename = (item: UploadedMedia) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };
  const commitRename = (item: UploadedMedia) => {
    const nextName = editingName.trim();

    if (nextName && nextName !== item.name) {
      onRename?.(item.id, nextName);
    }

    setEditingId(undefined);
    setEditingName("");
  };
  const cancelRename = () => {
    setEditingId(undefined);
    setEditingName("");
  };
  const startFolderRename = (group: MediaFolderGroup<UploadedMedia>) => {
    setEditingFolderKey(group.key);
    setEditingFolderName(group.label);
  };
  const commitFolderRename = (group: MediaFolderGroup<UploadedMedia>) => {
    const nextName = editingFolderName.trim();

    if (nextName && nextName !== group.label) {
      onRenameFolder?.(group.key, nextName);
    }

    setEditingFolderKey(undefined);
    setEditingFolderName("");
  };
  const cancelFolderRename = () => {
    setEditingFolderKey(undefined);
    setEditingFolderName("");
  };
  /*
   * 끄는 동안에는 목록을 건드리지 않고 놓을 위치만 기억합니다.
   * 이동할 때마다 순서를 바꾸면 끌고 있는 행이 포인터를 따라와 스스로를 가려버려
   * (elementFromPoint가 원본 행을 되짚어) 한 칸 이동한 뒤 멈춥니다.
   * 손을 뗄 때 한 번만 적용하면 이벤트가 촘촘하든 성기든 결과가 같아
   * 데스크탑·태블릿·모바일에서 동일하게 동작합니다.
   */
  const handleItemDragMove = (event: PointerEvent<HTMLElement>, sourceId: string) => {
    autoScrollListEdge(listRef.current, event.clientY);

    const target = getPointerDragTarget(event, "mediaRowId");

    // 유효한 자리일 때만 갱신합니다. 자기 행 위를 지날 때 지워버리면
    // 자동 스크롤로 목록이 밀리는 순간 목표를 잃어 아무 데도 못 놓습니다.
    if (target && target.key !== sourceId) {
      setItemDropTarget(target);
    }
  };
  const commitItemDrag = (sourceId: string) => {
    if (itemDropTarget && itemDropTarget.key !== sourceId) {
      onReorder(sourceId, itemDropTarget.key, itemDropTarget.placement);
    }

    cancelItemDrag();
  };
  const cancelItemDrag = () => {
    setDraggingId(undefined);
    setItemDropTarget(undefined);
  };
  const handleGroupDragMove = (event: PointerEvent<HTMLElement>, sourceGroupKey: string) => {
    autoScrollListEdge(listRef.current, event.clientY);

    const target = getPointerDragTarget(event, "mediaGroupKey");

    if (target && target.key !== sourceGroupKey) {
      setGroupDropTarget(target);
    }
  };
  const commitGroupDrag = (sourceGroupKey: string) => {
    if (groupDropTarget && groupDropTarget.key !== sourceGroupKey) {
      onReorderGroup?.(sourceGroupKey, groupDropTarget.key, groupDropTarget.placement);
    }

    cancelGroupDrag();
  };
  const cancelGroupDrag = () => {
    setDraggingGroupKey(undefined);
    setGroupDropTarget(undefined);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">{selectedVisibleCount}개 선택</p>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {shouldShowGroupHeaders ? (
            <Button
              aria-label={areAllGroupsCollapsed ? "Expand all groups" : "Collapse all groups"}
              className="h-8 px-2 text-xs"
              size="sm"
              variant="ghost"
              onClick={toggleAllGroups}
            >
              {areAllGroupsCollapsed ? (
                <ChevronsUpDown aria-hidden="true" data-icon="inline-start" className="text-accent-cyan" />
              ) : (
                <ChevronsDownUp aria-hidden="true" data-icon="inline-start" className="text-accent-cyan" />
              )}
              {areAllGroupsCollapsed ? "전체 펼치기" : "전체 접기"}
            </Button>
          ) : null}
          <Button className="h-8 px-2 text-xs" size="sm" variant="ghost" onClick={() => onToggleAll(!allChecked)}>
            {allChecked ? (
              <SquareMinus aria-hidden="true" data-icon="inline-start" className="text-warning" />
            ) : (
              <CheckCheck aria-hidden="true" data-icon="inline-start" className="text-link" />
            )}
            {allChecked ? "전체 해제" : "전체 선택"}
          </Button>
          {onClearAll ? (
            <Button
              aria-label="Clear all source media"
              className="h-8 px-2 text-xs hover:text-destructive"
              size="sm"
              variant="ghost"
              onClick={onClearAll}
            >
              <Trash2 aria-hidden="true" data-icon="inline-start" className="text-destructive" />
              전체 삭제
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" ref={listRef}>
        {groups.map((group) => (
          <section
            key={group.key}
            className="flex flex-col gap-2"
            data-media-group-key={group.key}
            data-testid={`media-group-${group.key}`}
            onPointerUp={cancelGroupDrag}
            onPointerCancel={cancelGroupDrag}
          >
            {shouldShowGroupHeaders ? (
              <div
                className={cn(
                  "flex min-h-10 items-center justify-between gap-2 rounded-sm border border-border bg-secondary/60 px-2 py-1.5",
                  draggingGroupKey === group.key && "border-primary bg-primary/10",
                  getDropIndicatorClass(groupDropTarget, group.key),
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {group.isFolder ? (
                    <>
                      <FolderCheckbox
                        groupKey={group.key}
                        isChecked={isGroupFullyChecked(group.items, checkedIds)}
                        isMixed={isGroupPartiallyChecked(group.items, checkedIds)}
                        label={group.label}
                        target="folder"
                        onToggle={() => {
                          toggleGroupChecked(group.items, checkedIds, onToggleChecked);
                        }}
                      />
                      <GroupDragHandle
                        groupKey={group.key}
                        label={group.label}
                        prefix="folder"
                        onDragStart={setDraggingGroupKey}
                        onDragMove={handleGroupDragMove}
                        onDrop={commitGroupDrag}
                        onDragCancel={cancelGroupDrag}
                      />
                      <Button
                        aria-expanded={!collapsedGroupKeys.has(group.key)}
                        aria-label={`${collapsedGroupKeys.has(group.key) ? "Expand" : "Collapse"} folder ${group.label}`}
                        className="size-7 shrink-0"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setCollapsedGroupKeys((current) => {
                            const next = new Set(current);

                            if (next.has(group.key)) {
                              next.delete(group.key);
                            } else {
                              next.add(group.key);
                            }

                            return next;
                          });
                        }}
                      >
                        {collapsedGroupKeys.has(group.key) ? (
                          <ChevronRight aria-hidden="true" className="size-4" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <FolderCheckbox
                        groupKey={group.key}
                        isChecked={isGroupFullyChecked(group.items, checkedIds)}
                        isMixed={isGroupPartiallyChecked(group.items, checkedIds)}
                        label={group.label}
                        target="group"
                        onToggle={() => {
                          toggleGroupChecked(group.items, checkedIds, onToggleChecked);
                        }}
                      />
                      <GroupDragHandle
                        groupKey={group.key}
                        label={group.label}
                        prefix="group"
                        onDragStart={setDraggingGroupKey}
                        onDragMove={handleGroupDragMove}
                        onDrop={commitGroupDrag}
                        onDragCancel={cancelGroupDrag}
                      />
                      <Button
                        aria-expanded={!collapsedGroupKeys.has(group.key)}
                        aria-label={`${collapsedGroupKeys.has(group.key) ? "Expand" : "Collapse"} group ${group.label}`}
                        className="size-7 shrink-0"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setCollapsedGroupKeys((current) => {
                            const next = new Set(current);

                            if (next.has(group.key)) {
                              next.delete(group.key);
                            } else {
                              next.add(group.key);
                            }

                            return next;
                          });
                        }}
                      >
                        {collapsedGroupKeys.has(group.key) ? (
                          <ChevronRight aria-hidden="true" className="size-4" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                    </>
                  )}
                  {/*
                    * 그룹 아이콘은 이름 바로 왼쪽에 붙여 무엇의 이름인지 한눈에 보이게 합니다.
                    * 업로드한 폴더는 폴더로, 폴더에 속하지 않은 파일 묶음은 낱장 파일로 구분합니다.
                    */}
                  {group.isFolder ? (
                    <Folder
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                      data-testid={`folder-group-icon-${group.key}`}
                    />
                  ) : (
                    <Files
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                      data-testid={`loose-group-icon-${group.key}`}
                    />
                  )}
                  {group.isFolder && editingFolderKey === group.key ? (
                    <input
                      aria-label={`Rename folder ${group.label}`}
                      autoFocus
                      className="h-7 min-w-0 flex-1 rounded-sm border border-primary bg-background px-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editingFolderName}
                      onBlur={() => commitFolderRename(group)}
                      onChange={(event) => setEditingFolderName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();

                        if (event.key === "Enter") {
                          commitFolderRename(group);
                        }

                        if (event.key === "Escape") {
                          cancelFolderRename();
                        }
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <button
                      aria-label={group.isFolder ? `Edit folder name ${group.label}` : undefined}
                      className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                      disabled={!group.isFolder}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        if (group.isFolder) {
                          startFolderRename(group);
                        }
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <p className="truncate text-xs font-semibold">{group.label}</p>
                    </button>
                  )}
                  <Badge className="shrink-0" variant={group.isFolder ? "success" : "secondary"}>
                    {group.items.length}개 항목
                  </Badge>
                </div>
                {group.isFolder ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      aria-label={`Delete folder ${group.label}`}
                      className="h-7 px-2 text-xs hover:text-destructive"
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveFolder(group.key)}
                    >
                      <Trash2 data-icon="inline-start" />
                      그룹 삭제
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {collapsedGroupKeys.has(group.key)
              ? null
              : group.items.map((item) => {
                  const relativePath = getFileRelativePath(item.file);
                  const isChecked = checkedIds.has(item.id);
                  const isBusy = item.status === "pending" || item.status === "processing";
                  const canDownload = Boolean(item.result) && !isBusy;

                  return (
                    <div
                      id={`media-row-${item.id}`}
                      key={item.id}
                      data-media-row-id={item.id}
                      data-testid={`media-row-${item.id}`}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => onSelect(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(item.id);
                        }
                      }}
                      onPointerUp={cancelItemDrag}
                      onPointerCancel={cancelItemDrag}
                      className={cn(
                        // 체크박스·핸들·액션을 행 세로 가운데에 맞춥니다. mt-* 로 눈대중 보정하던 것을 대체합니다.
                        "group relative grid w-full cursor-pointer grid-cols-[28px_24px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background p-2 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-foreground/30 hover:bg-secondary/60 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedId === item.id && "border-primary bg-secondary",
                        draggingId === item.id && "border-primary bg-primary/10",
                        getDropIndicatorClass(itemDropTarget, item.id),
                        item.error?.code === "unsupported_file_type" && "border-destructive bg-destructive/5",
                      )}
                    >
                      <input
                        aria-label={`Select ${item.name}`}
                        checked={isChecked}
                        className="size-4 cursor-pointer justify-self-center rounded-sm border border-input accent-primary"
                        type="checkbox"
                        onChange={() => onToggleChecked(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      />
                      <button
                        aria-label={`Reorder ${item.name}`}
                        className={cn(DRAG_HANDLE_HIT_AREA, "size-6 hover:bg-secondary")}
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDraggingId(item.id);
                          event.currentTarget.setPointerCapture?.(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                          if (draggingId === item.id) {
                            handleItemDragMove(event, item.id);
                          }
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          commitItemDrag(item.id);
                        }}
                        onPointerCancel={cancelItemDrag}
                        onLostPointerCapture={cancelItemDrag}
                      >
                        <GripVertical aria-hidden="true" className="size-4" />
                      </button>
                      <div className="flex min-w-0 items-start gap-3 rounded-sm p-1 text-left">
                        <button
                          aria-label={`Open ${item.name}`}
                          className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(item.id);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <MediaThumbnail item={item} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            {editingId === item.id ? (
                              <input
                                aria-label={`Rename ${item.name}`}
                                autoFocus
                                className="h-7 min-w-0 flex-1 rounded-sm border border-primary bg-background px-2 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={editingName}
                                onBlur={() => commitRename(item)}
                                onChange={(event) => setEditingName(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  event.stopPropagation();

                                  if (event.key === "Enter") {
                                    commitRename(item);
                                  }

                                  if (event.key === "Escape") {
                                    cancelRename();
                                  }
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                              />
                            ) : (
                              <button
                                aria-label={`Edit filename ${item.name}`}
                                className="min-w-0 truncate rounded-sm text-left text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startRename(item);
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                              >
                                {item.name}
                              </button>
                            )}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <p className="font-brand-mono shrink-0 text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                            <MimePill item={item} />
                          </div>
                          {relativePath ? (
                            <p className="font-brand-mono mt-1 truncate text-[11px] text-muted-foreground">{relativePath}</p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={item.progress} />
                            <span className="font-brand-mono w-9 shrink-0 text-right text-[11px] text-muted-foreground">
                              {item.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {/*
                          * 호버 색은 버튼 기본 transition(color 150ms)을 타고 서서히 물듭니다.
                          * 비활성 다운로드는 disabled:pointer-events-none 때문에 호버 자체가 안 걸립니다.
                          */}
                        <Button
                          aria-label={`Download ${item.name}`}
                          className="hover:text-link"
                          disabled={!canDownload}
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDownload(item.id);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <Download data-icon="inline-start" />
                        </Button>
                        <Button
                          aria-label={`Remove ${item.name}`}
                          className="hover:text-destructive"
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemove(item.id);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <Trash2 data-icon="inline-start" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
          </section>
        ))}
      </div>
    </div>
  );
}

function isGroupFullyChecked(items: UploadedMedia[], checkedIds: Set<string>) {
  return items.length > 0 && items.every((item) => checkedIds.has(item.id));
}

function isGroupPartiallyChecked(items: UploadedMedia[], checkedIds: Set<string>) {
  const checkedCount = items.filter((item) => checkedIds.has(item.id)).length;
  return checkedCount > 0 && checkedCount < items.length;
}

function toggleGroupChecked(items: UploadedMedia[], checkedIds: Set<string>, onToggleChecked: (id: string) => void) {
  const shouldCheck = !isGroupFullyChecked(items, checkedIds);

  items.forEach((item) => {
    if (checkedIds.has(item.id) !== shouldCheck) {
      onToggleChecked(item.id);
    }
  });
}

function GroupDragHandle({
  groupKey,
  label,
  prefix,
  onDragStart,
  onDragMove,
  onDrop,
  onDragCancel,
}: {
  groupKey: string;
  label: string;
  prefix: "folder" | "group";
  onDragStart: (groupKey: string) => void;
  onDragMove: (event: PointerEvent<HTMLElement>, groupKey: string) => void;
  /** 손을 뗐을 때. 여기서만 순서를 확정합니다. */
  onDrop: (groupKey: string) => void;
  onDragCancel: () => void;
}) {
  return (
    <button
      aria-label={`Reorder ${prefix} ${label}`}
      className={cn(DRAG_HANDLE_HIT_AREA, "size-7 hover:bg-background")}
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragStart(groupKey);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => onDragMove(event, groupKey)}
      onPointerUp={(event) => {
        event.stopPropagation();
        onDrop(groupKey);
      }}
      onPointerCancel={onDragCancel}
      onLostPointerCapture={onDragCancel}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
}

/**
 * 드래그 핸들 공통 스타일.
 * 손가락으로 잡기엔 24~28px가 작아 ::before로 사방 8px을 더해 잡는 영역만 40px대로 넓힙니다.
 * 눈에 보이는 크기와 그리드 칸 폭은 그대로라 배치가 흔들리지 않습니다.
 */
const DRAG_HANDLE_HIT_AREA =
  "relative flex shrink-0 touch-none cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:text-primary active:cursor-grabbing before:absolute before:-inset-2 before:content-['']";

/** 놓을 자리. 대상 행/그룹의 위(before)냐 아래(after)냐까지 담습니다. */
type DropTarget = { key: string; placement: ReorderPlacement };

/** 목록 가장자리에서 이만큼 안쪽에 들어오면 스크롤을 시작합니다. */
const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_STEP = 14;

/**
 * 화면 밖 위치로도 옮길 수 있게, 목록 위아래 끝에서 끌면 스크롤합니다.
 * ponytail: 포인터가 움직일 때만 한 칸씩 밉니다. 끝에 가만히 대고 있어도 계속 흐르게
 * 하려면 타이머가 필요한데, 그만한 값어치가 없어 살짝 움직이는 것으로 대신합니다.
 */
function autoScrollListEdge(list: HTMLDivElement | null, pointerY: number) {
  if (!list) {
    return;
  }

  const rect = list.getBoundingClientRect();

  if (pointerY < rect.top + AUTO_SCROLL_EDGE) {
    list.scrollTop -= AUTO_SCROLL_STEP;
    return;
  }

  if (pointerY > rect.bottom - AUTO_SCROLL_EDGE) {
    list.scrollTop += AUTO_SCROLL_STEP;
  }
}

/** 놓을 자리를 알려주는 선. 대상 행 위/아래에 안쪽 그림자로 그려 높이가 흔들리지 않습니다. */
function getDropIndicatorClass(target: DropTarget | undefined, key: string) {
  if (target?.key !== key) {
    return undefined;
  }

  return target.placement === "before"
    ? "shadow-[inset_0_3px_0_0_hsl(var(--primary))]"
    : "shadow-[inset_0_-3px_0_0_hsl(var(--primary))]";
}

function getPointerDragTarget(event: PointerEvent<HTMLElement>, datasetKey: "mediaRowId" | "mediaGroupKey") {
  const element = document.elementFromPoint?.(event.clientX, event.clientY);
  const target = element?.closest<HTMLElement>(datasetKey === "mediaRowId" ? "[data-media-row-id]" : "[data-media-group-key]");
  const key = target?.dataset[datasetKey];

  if (!target || !key) {
    return undefined;
  }

  const rect = target.getBoundingClientRect();
  const pointerY = event.clientY || event.pageY || event.screenY;
  const placement: ReorderPlacement = pointerY > rect.top + rect.height / 2 ? "after" : "before";

  return { key, placement };
}

function FolderCheckbox({
  groupKey,
  isChecked,
  isMixed,
  label,
  target,
  onToggle,
}: {
  groupKey: string;
  isChecked: boolean;
  isMixed: boolean;
  label: string;
  target: "folder" | "group";
  onToggle: () => void;
}) {
  const state = isMixed ? "mixed" : isChecked ? "checked" : "unchecked";

  return (
    <button
      aria-checked={isMixed ? "mixed" : isChecked}
      aria-label={`${isChecked ? "Deselect" : "Select"} ${target} ${label}`}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border text-[10px] transition-colors",
        state === "unchecked" && "border-input bg-background text-transparent",
        state !== "unchecked" && "border-primary bg-primary text-primary-foreground",
      )}
      role="checkbox"
      type="button"
      onClick={onToggle}
    >
      <span data-state={state} data-testid={`folder-checkbox-icon-${groupKey}`} className="flex items-center justify-center">
        {state === "mixed" ? <Minus aria-hidden="true" className="size-3" /> : null}
        {state === "checked" ? <Check aria-hidden="true" className="size-3" /> : null}
      </span>
    </button>
  );
}

function MimePill({ item }: { item: UploadedMedia }) {
  return (
    <span
      data-testid={`mime-pill-${item.id}`}
      className={cn(
        "font-brand-mono min-w-0 truncate rounded-sm border px-1.5 py-0.5 text-[11px] leading-4",
        // 타입 구분은 색이 아니라 라벨로 합니다. accent는 chrome에 쓰지 않습니다.
        "border-border bg-secondary text-body",
      )}
    >
      {item.mimeType || "unknown MIME"}
    </span>
  );
}

function MediaThumbnail({ item }: { item: UploadedMedia }) {
  const className = "mt-0.5 size-12 shrink-0 overflow-hidden rounded-sm border border-border bg-secondary object-cover";

  if (item.type === "video") {
    return (
      <video
        aria-label={`${item.name} preview`}
        className={className}
        muted
        playsInline
        preload="metadata"
        src={item.objectUrl}
      />
    );
  }

  return <img alt={`${item.name} preview`} className={className} src={item.objectUrl} />;
}
