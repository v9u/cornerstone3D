import { cache } from '@cornerstonejs/core'

import triggerSegmentationRender from '../../utilities/triggerSegmentationRender'
import SegmentationRepresentations from '../../enums/SegmentationRepresentations'
import * as SegmentationState from '../../stateManagement/segmentation/segmentationState'
import { SegmentationDataModifiedEventType } from '../../types/EventTypes'

/** A callback function that is called when the segmentation data is modified which
 *  often is as a result of tool interactions e.g., scissors, eraser, etc.
 */
const onSegmentationDataModified = function (
  evt: SegmentationDataModifiedEventType
): void {
  const { toolGroupUID, segmentationDataUID } = evt.detail

  const segmentationData = SegmentationState.getSegmentationDataByUID(
    toolGroupUID,
    segmentationDataUID
  )

  if (!segmentationData) {
    console.warn(
      `onSegmentationDataModified: segmentationDataUID ${segmentationDataUID} not found in toolGroupUID ${toolGroupUID}`
    )
    return
  }

  const {
    representation: { type },
  } = segmentationData

  let toolGroupUIDs
  if (type === SegmentationRepresentations.Labelmap) {
    // get the volume from cache, we need the openGLTexture to be updated to GPU
    const { volumeUID } = segmentationData
    const segmentation = cache.getVolume(volumeUID)

    if (!segmentation) {
      console.warn('segmentation not found in cache')
      return
    }
    const { imageData, vtkOpenGLTexture, uid } = segmentation

    // Todo: this can be optimized to not use the full texture from all slices
    const numSlices = imageData.getDimensions()[2]
    const modifiedSlicesToUse = [...Array(numSlices).keys()]

    // Update the texture for the volume in the GPU
    modifiedSlicesToUse.forEach((i) => {
      vtkOpenGLTexture.setUpdatedFrame(i)
    })

    // Trigger modified on the imageData to update the image
    imageData.modified()
    toolGroupUIDs = SegmentationState.getToolGroupsWithSegmentation(uid)
  } else {
    throw new Error(
      `onSegmentationDataModified: representationType ${type} not supported yet`
    )
  }

  toolGroupUIDs.forEach((toolGroupUID) => {
    triggerSegmentationRender(toolGroupUID)
  })
}

export default onSegmentationDataModified