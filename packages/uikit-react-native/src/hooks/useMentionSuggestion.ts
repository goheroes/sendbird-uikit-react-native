import { useCallback, useEffect, useRef, useState } from 'react';

import type { SendbirdGroupChannel, SendbirdMember, SendbirdUser } from '@sendbird/uikit-utils';

import { useSendbirdChat } from '../hooks/useContext';
import type { Range } from '../types';

const useMentionSuggestion = (params: {
  text: string;
  selection: Range;
  channel: SendbirdGroupChannel;
  mentionedUsers: { user: SendbirdUser; range: Range }[];
}) => {
  const { text, selection, channel, mentionedUsers } = params;

  const { mentionManager, currentUser } = useSendbirdChat();
  const [members, setMembers] = useState<SendbirdMember[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const searchStringRangeRef = useRef<Range>({ start: 0, end: 0 });
  const searchLimitedRef = useRef(false);

  const updateSearchStringRange = (selectionIndex: number, searchString: string) => {
    searchStringRangeRef.current = mentionManager.getSearchStringRangeInText(selectionIndex, searchString);
    return searchStringRangeRef.current;
  };
  const updateSearchLimited = (mentionCount: number, mentionLimit: number) => {
    searchLimitedRef.current = mentionCount >= mentionLimit;
    return searchLimitedRef.current;
  };
  const resetRefs = () => {
    searchLimitedRef.current = false;
    searchStringRangeRef.current = { start: 0, end: 0 };
  };

  // TODO: prevent search in mentioned range
  const fetchMembers = async (): Promise<SendbirdMember[]> => {
    resetRefs();

    const selectionRanged = selection.start !== selection.end;
    if (selectionRanged) return [];

    const { isTriggered, isValidSearchString, searchString } = mentionManager.findSearchString(text, selection.start);
    if (!isTriggered() || !isValidSearchString()) return [];

    const limited = updateSearchLimited(mentionedUsers.length, mentionManager.config.mentionLimit);
    if (limited) return [];

    updateSearchStringRange(selection.start, searchString);

    if (channel.isSuper) {
      return channel
        .createMemberListQuery({
          nicknameStartsWithFilter: searchString,
          limit: mentionManager.config.suggestionLimit + 1,
        })
        .next()
        .then((members) => members.filter((member) => member.userId !== currentUser?.userId));
    } else {
      return channel.members
        .sort((a, b) => a.nickname?.localeCompare(b.nickname))
        .filter((member) => member.nickname?.startsWith(searchString) && member.userId !== currentUser?.userId)
        .slice(0, mentionManager.config.suggestionLimit);
    }
  };

  useEffect(() => {
    timeoutRef.current = setTimeout(async () => {
      fetchMembers()
        .then(setMembers)
        .catch(() => setMembers([]))
        .finally(() => (timeoutRef.current = undefined));
    }, mentionManager.config.debounceMills);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [text, selection]);

  return {
    members,
    reset: useCallback(() => setMembers([]), []),
    searchStringRange: searchStringRangeRef.current,
    searchLimited: searchLimitedRef.current,
  };
};

export default useMentionSuggestion;
