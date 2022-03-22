import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Sendbird from 'sendbird';

import type { SendbirdChannel, SendbirdChatSDK } from '@sendbird/uikit-utils';
import { Logger, arrayToMap, useAsyncEffect, useUniqId } from '@sendbird/uikit-utils';

import useInternalPubSub from '../common/useInternalPubSub';
import useChannelHandler from '../handler/useChannelHandler';
import type { UseGroupChannelList, UseGroupChannelListOptions } from '../types';

type GroupChannelMap = Record<string, Sendbird.GroupChannel>;

const createGroupChannelListCollection = (
  sdk: SendbirdChatSDK,
  collectionCreator: UseGroupChannelListOptions['collectionCreator'],
) => {
  const passedCollection = collectionCreator?.();
  if (passedCollection) return passedCollection;

  const defaultCollection = sdk.GroupChannel.createGroupChannelCollection();
  const filter = new sdk.GroupChannelFilter();
  filter.includeEmpty = true;
  filter.memberStateFilter = sdk.GroupChannelFilter.MemberStateFilter.ALL;
  return defaultCollection
    .setLimit(10)
    .setFilter(filter)
    .setOrder(sdk.GroupChannelCollection.GroupChannelOrder.LATEST_LAST_MESSAGE)
    .build();
};

const HOOK_NAME = 'useGroupChannelListWithCollection';

export const useGroupChannelListWithCollection = (
  sdk: SendbirdChatSDK,
  userId?: string,
  options?: UseGroupChannelListOptions,
): UseGroupChannelList => {
  const id = useUniqId(HOOK_NAME);
  const { events, subscribe } = useInternalPubSub();

  const collectionRef = useRef<Sendbird.GroupChannelCollection>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [groupChannelMap, setGroupChannelMap] = useState<GroupChannelMap>({});
  const groupChannels = useMemo(() => {
    const channels = Object.values(groupChannelMap);
    if (options?.sortComparator) return channels.sort(options?.sortComparator);
    return channels;
  }, [groupChannelMap, options?.sortComparator]);

  // ---------- internal methods ---------- //
  const updateChannels = (channels: SendbirdChannel[], clearPrev: boolean) => {
    const groupChannels = channels.filter((c): c is Sendbird.GroupChannel => c.isGroupChannel());
    if (clearPrev) setGroupChannelMap(arrayToMap(groupChannels, 'url'));
    else setGroupChannelMap((prev) => ({ ...prev, ...arrayToMap(groupChannels, 'url') }));
    groupChannels.forEach((channel) => sdk.markAsDelivered(channel.url));
  };
  const deleteChannels = (channelUrls: string[]) => {
    setGroupChannelMap(({ ...draft }) => {
      channelUrls.forEach((url) => delete draft[url]);
      return draft;
    });
  };
  const init = useCallback(
    async (uid?: string) => {
      if (collectionRef.current) collectionRef.current?.dispose();

      if (uid) {
        collectionRef.current = createGroupChannelListCollection(sdk, options?.collectionCreator);
        if (collectionRef.current?.hasMore) {
          updateChannels(await collectionRef.current?.loadMore(), true);
        }

        collectionRef.current?.setGroupChannelCollectionHandler({
          onChannelsAdded(_, channels) {
            updateChannels(channels, false);
          },
          onChannelsUpdated(_, channels) {
            updateChannels(channels, false);
          },
          onChannelsDeleted(_, channelUrls) {
            deleteChannels(channelUrls);
          },
        });
      }
    },
    [sdk, options?.collectionCreator],
  );
  // ---------- internal methods ends ---------- //

  // ---------- internal hooks ---------- //
  useEffect(() => {
    return () => {
      if (collectionRef.current) collectionRef.current?.dispose();
    };
  }, []);
  useAsyncEffect(async () => {
    setLoading(true);
    await init(userId);
    setLoading(false);
  }, [init, userId]);

  useEffect(() => {
    const unsubscribes = [
      subscribe(
        events.ChannelUpdated,
        ({ channel }, err) => {
          if (err) Logger.warn(HOOK_NAME, 'Cannot update channels', err);
          else updateChannels([channel], false);
        },
        HOOK_NAME,
      ),
      subscribe(
        events.ChannelDeleted,
        ({ channelUrl }, err) => {
          if (err) Logger.warn(HOOK_NAME, 'Cannot delete channels', err);
          else deleteChannels([channelUrl]);
        },
        HOOK_NAME,
      ),
    ];

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, []);

  useChannelHandler(
    sdk,
    `${HOOK_NAME}_${id}`,
    {
      onChannelChanged: (channel) => updateChannels([channel], false),
      onChannelFrozen: (channel) => updateChannels([channel], false),
      onChannelUnfrozen: (channel) => updateChannels([channel], false),
      onChannelMemberCountChanged: (channels) => updateChannels(channels, false),
      onChannelDeleted: (url) => deleteChannels([url]),
      onUserJoined: (channel) => updateChannels([channel], false),
      onUserLeft: (channel, user) => {
        const isMe = user.userId === userId;
        if (isMe) deleteChannels([channel.url]);
        else updateChannels([channel], false);
      },
    },
    [sdk, userId],
  );
  // ---------- internal hooks ends ---------- //

  // ---------- returns methods ---------- //
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await init(userId);
    setRefreshing(false);
  }, [init, userId]);

  const update = useCallback(
    (channel: Sendbird.GroupChannel) => {
      sdk.markAsDelivered(channel.url);
      setGroupChannelMap((prev) => ({ ...prev, [channel.url]: channel }));
    },
    [sdk],
  );

  const next = useCallback(async () => {
    if (collectionRef.current?.hasMore) {
      const channels = await collectionRef.current?.loadMore();
      setGroupChannelMap((prev) => ({ ...prev, ...arrayToMap(channels, 'url') }));
      channels.forEach((channel) => sdk.markAsDelivered(channel.url));
    }
  }, [sdk]);
  // ---------- returns methods ends ---------- //

  return {
    loading,
    groupChannels,
    refresh,
    refreshing,
    next,
    update,
  };
};
