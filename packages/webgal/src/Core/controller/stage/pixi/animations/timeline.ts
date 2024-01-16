import { ITransform } from '@/store/stageInterface';
import { animate } from 'popmotion';
import { WebGAL } from '@/Core/WebGAL';
import { webgalStore } from '@/store/store';
import { stageActions } from '@/store/stageReducer';

/**
 * 动画创建模板
 * @param timeline
 * @param targetKey 作用目标
 * @param duration 持续时间
 */
export function generateTimelineObj(
  timeline: Array<ITransform & { duration: number }>,
  targetKey: string,
  duration: number,
) {
  const target = WebGAL.gameplay.pixiStage!.getStageObjByKey(targetKey);
  let currentDelay = 0;
  const values = [];
  const times: number[] = [];
  for (const segment of timeline) {
    const segmentDuration = segment.duration;
    currentDelay += segmentDuration;
    const { position, scale, ...segmentValues } = segment;
    // 不能用 scale，因为 popmotion 不能用嵌套
    values.push({ x: position.x, y: position.y, scaleX: scale.x, scaleY: scale.y, ...segmentValues });
    times.push(currentDelay / duration);
  }
  const container = target?.pixiContainer;
  let animateInstance = animate({
    to: values,
    offset: times,
    duration,
    onUpdate: (updateValue) => {
      if (container) {
        const { scaleX, scaleY, ...val } = updateValue;
        Object.assign(container, val);
        // 因为 popmotion 不能用嵌套，scale 要手动设置
        container.scale.x = scaleX;
        container.scale.y = scaleY;
      }
    },
  });

  const { duration: sliceDuration, ...endState } = getEndStateEffect();
  webgalStore.dispatch(stageActions.updateEffect({ target: targetKey, transform: endState }));

  /**
   * 在此书写为动画设置初态的操作
   */
  function setStartState() {
    if (target?.pixiContainer) {
      // 不能赋值到 position，因为 x 和 y 被 WebGALPixiContainer 代理，而 position 属性没有代理
      const { position, ...state } = getStartStateEffect();
      Object.assign(target?.pixiContainer, { x: position.x, y: position.y, ...state });
    }
  }

  /**
   * 在此书写为动画设置终态的操作
   */
  function setEndState() {
    animateInstance.stop();
    if (target?.pixiContainer) {
      // 不能赋值到 position，因为 x 和 y 被 WebGALPixiContainer 代理，而 position 属性没有代理
      const { position, ...state } = getEndStateEffect();
      Object.assign(target?.pixiContainer, { x: position.x, y: position.y, ...state });
    }
  }

  /**
   * 在此书写动画每一帧执行的函数
   * @param delta
   */
  function tickerFunc(delta: number) {}

  function getStartStateEffect() {
    return timeline[0];
  }

  function getEndStateEffect() {
    return timeline[timeline.length - 1];
  }

  function getEndFilterEffect() {
    const endSegment = timeline[timeline.length - 1];
    const { alpha, rotation, blur, duration, scale, position, ...rest } = endSegment;
    return rest;
  }

  return {
    setStartState,
    setEndState,
    tickerFunc,
    getEndFilterEffect,
  };
}
