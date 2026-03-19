/*
Module: crop workspace
Description: Crop view selection state helpers for sidebar and expanded workspace.
Domain: domain/crop
Dependencies: none
Usage:
  const cropWorkspace = createCropWorkspaceController({...});
  const selection = cropWorkspace.getCropSelectionForView("sidebar");
*/

function createCropWorkspaceController({
  cropViews,
  getIsCropStageExpanded,
  getCropSelection,
  setCropSelection,
  getExpandedCropSelection,
  setExpandedCropSelection,
  setExpandedCropDraft,
}) {
  function getVisibleCropViews() {
    return getIsCropStageExpanded() ? [cropViews.sidebar, cropViews.expanded] : [cropViews.sidebar];
  }

  function getReferenceCropView() {
    return getIsCropStageExpanded() ? cropViews.expanded : cropViews.sidebar;
  }

  function getCropViewByKey(viewKey) {
    return cropViews[viewKey] || cropViews.sidebar;
  }

  function getCropSelectionForView(viewKey) {
    return viewKey === "expanded" ? getExpandedCropSelection() : getCropSelection();
  }

  function setCropSelectionForView(viewKey, selection) {
    if (viewKey === "expanded") {
      setExpandedCropSelection(selection ? { ...selection } : null);
      setExpandedCropDraft(null);
      return;
    }

    setCropSelection(selection ? { ...selection } : null);
  }

  function syncExpandedSelectionToSidebar() {
    const expandedCropSelection = getExpandedCropSelection();
    if (!expandedCropSelection) {
      return;
    }

    setCropSelection({ ...expandedCropSelection });
  }

  function getNaturalCropImageElement() {
    if (cropViews.sidebar.image?.naturalWidth) {
      return cropViews.sidebar.image;
    }
    if (cropViews.expanded.image?.naturalWidth) {
      return cropViews.expanded.image;
    }
    return null;
  }

  return {
    getCropSelectionForView,
    getCropViewByKey,
    getNaturalCropImageElement,
    getReferenceCropView,
    getVisibleCropViews,
    setCropSelectionForView,
    syncExpandedSelectionToSidebar,
  };
}

export { createCropWorkspaceController };
