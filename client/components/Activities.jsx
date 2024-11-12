import React from 'react';
import styled from 'styled-components';

const ActivitiesContainer = styled.div`
  margin-bottom: 16px;
`;

const ActivityTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 8px;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ActivityItem = styled.div`
  margin-bottom: 8px;
  font-size: 14px;
`;

const ViewAllButton = styled.button`
  background-color: #f0f0f0;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  &:hover {
    background-color: #e0e0e0;
  }
`;

const Activities: React.FC = () => {
  const activities = [
    { user: 'Allen Smith', action: 'uploaded a document', document: '2023 W-2.pdf', time: 'a day ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'yc-post-money-safe-with-discount.pdf', time: '2 days ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'Atlas-Articles-of-Incorporation.pdf', time: '3 days ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'Atlas-Corp-Operating-Agreement.pdf', time: '3 days ago' },
  ];

  return (
    <ActivitiesContainer>
      <ActivityTitle>Activities</ActivityTitle>
      <ActivityList>
        {activities.map((activity, index) => (
          <ActivityItem key={index}>
            {activity.user} {activity.action}: {activity.document} {activity.time}
          </ActivityItem>
        ))}
      </ActivityList>
      <ViewAllButton>View all activity</ViewAllButton>
    </ActivitiesContainer>
  );
};

export default Activities;