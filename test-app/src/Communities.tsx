import React from 'react';
import { add, remove, useCommunityAt, useCommunitiesIds } from '../Form/communities'
import { Community as Comm, FollowUpActions } from '../ITestForm';

interface ICommunityProps {
    index: number;
    id: string;
  }

const getCommunity = () => {
    let id = 0;
    return () => ({
      communityId: `someid${++id}`,
      name: 'somename',
      fee: 120,
      followUpAction: FollowUpActions.SendEmail,
      actionDate: new Date(),
    })
  }
const uniqeCommunityBuilder = getCommunity();

export const Communities = () => {
    const communityIndexes = useCommunitiesIds((comm: Comm) => comm.communityId);
    
    return (
      <div>
        <div>Communities</div>
        <button onClick={() => add(uniqeCommunityBuilder())}>Add Community</button>
        {
          communityIndexes.map((id, idx) => (
            <div key={id}>
              <Community id={id} index={idx} />
              <div style={{ display: 'inline-block' }}>
                <button onClick={_ => remove(idx)}>x</button>
              </div>
            </div>
          ))
        }
      </div>
    )
  }
  
  export const Community = ({ index }: ICommunityProps) => {
    const [ community, { setFee }] = useCommunityAt(index);
  
    return (
      <div>
        <div>Fee</div>
        <input type='number' value={(community || {}).fee} onChange={e => setFee(parseInt(e.target.value))} />
      </div>
    )
  }