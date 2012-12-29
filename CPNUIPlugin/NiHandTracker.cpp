/****************************************************************************
*                                                                           *
*  OpenNI 1.x Alpha                                                         *
*  Copyright (C) 2011 PrimeSense Ltd.                                       *
*                                                                           *
*  This file is part of OpenNI.                                             *
*                                                                           *
*  OpenNI is free software: you can redistribute it and/or modify           *
*  it under the terms of the GNU Lesser General Public License as published *
*  by the Free Software Foundation, either version 3 of the License, or     *
*  (at your option) any later version.                                      *
*                                                                           *
*  OpenNI is distributed in the hope that it will be useful,                *
*  but WITHOUT ANY WARRANTY; without even the implied warranty of           *
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
*  GNU Lesser General Public License for more details.                      *
*                                                                           *
*  You should have received a copy of the GNU Lesser General Public License *
*  along with OpenNI. If not, see <http://www.gnu.org/licenses/>.           *
*                                                                           *
****************************************************************************/
//---------------------------------------------------------------------------
// Includes
//---------------------------------------------------------------------------
#include "NiHandTracker.h"
#include <cassert>
#include <cmath>
#include <algorithm>

using namespace xn;

#include "CPNUIPluginAPI.h"
boost::weak_ptr<CPNUIPluginAPI> GJSAPI;


//---------------------------------------------------------------------------
// Defines
//---------------------------------------------------------------------------
#define LENGTHOF(arr)			(sizeof(arr)/sizeof(arr[0]))
#define FOR_ALL(arr, action)	{for(int i = 0; i < LENGTHOF(arr); ++i){action(arr[i])}}

#define ADD_GESTURE(name)		{if(m_GestureGenerator.AddGesture(name, NULL) != XN_STATUS_OK){printf("Unable to add gesture"); exit(1);}}
#define REMOVE_GESTURE(name)	{if(m_GestureGenerator.RemoveGesture(name) != XN_STATUS_OK){printf("Unable to remove gesture"); exit(1);}}

#define ADD_ALL_GESTURES		FOR_ALL(cGestures, ADD_GESTURE)
#define REMOVE_ALL_GESTURES		FOR_ALL(cGestures, REMOVE_GESTURE)


//---------------------------------------------------------------------------
// Consts
//---------------------------------------------------------------------------
// Gestures to track
static const char			cClickStr[] = "Click";
static const char			cWaveStr[] = "Wave";
static const char* const	cGestures[] =
{
	cClickStr,
	cWaveStr
};

//---------------------------------------------------------------------------
// Statics
//---------------------------------------------------------------------------
XnListT<HandTracker*>	HandTracker::sm_Instances;

//---------------------------------------------------------------------------
// Hooks
//---------------------------------------------------------------------------
void XN_CALLBACK_TYPE HandTracker::Gesture_Recognized(	xn::GestureGenerator&	/*generator*/,
														const XnChar*			strGesture,
														const XnPoint3D*		pIDPosition,
														const XnPoint3D*		pEndPosition,
														void*					pCookie)
{
	printf("Gesture recognized: %s\n", strGesture);

	HandTracker*	pThis = static_cast<HandTracker*>(pCookie);
	if(sm_Instances.Find(pThis) == sm_Instances.End())
	{
		printf("Dead HandTracker: skipped!\n");
		return;
	}
	else
	{
		XnUserID ClosestHand = 0;
		XnFloat ClosestDistance = 100000.f * 100000.f;
		const TrailHistory::ConstIterator HEnd = pThis->m_History.End();
		int Index = 0;
		printf("Looking for closest hand\n");
		for (TrailHistory::ConstIterator HIt = pThis->m_History.Begin();
			HIt != HEnd;
			++HIt, ++Index)
		{
			const Trail& Tr = HIt->Value();
			const XnPoint3D LastPoint = Tr.Top();
			const XnPoint3D Diff = {
				pEndPosition->X - LastPoint.X,
				pEndPosition->Y - LastPoint.Y,
				pEndPosition->Z - LastPoint.Z
			};
			const XnFloat Dist = Diff.X * Diff.X +
								Diff.Y * Diff.Y +
								Diff.Z * Diff.Z;
			printf("Distance: %f Index: %d\n", sqrtf(Dist), Index);
			if (ClosestDistance > Dist)
			{
				ClosestDistance = Dist;
				ClosestHand = Index;
			}
		}
		printf("Closest: %f Index: %d\n", sqrtf(ClosestDistance), ClosestHand);
		if (!GJSAPI.expired())
		{
			std::vector<float> IDPos(3), EndPos(3);
			IDPos[0] = pIDPosition->X;
			IDPos[1] = pIDPosition->Y;
			IDPos[2] = pIDPosition->Z;
			EndPos[0] = pEndPosition->X;
			EndPos[1] = pEndPosition->Y;
			EndPos[2] = pEndPosition->Z;
			boost::shared_ptr<CPNUIPluginAPI> SharedPtr = GJSAPI.lock();
			SharedPtr->fire_gestureRecognized(ClosestHand, strGesture, IDPos,
				EndPos);
		}
	}

	pThis->m_HandsGenerator.StartTracking(*pEndPosition);
}

enum CPGestureState
{
	GS_NONE,
	GS_SWIPE_LEFT,
	GS_SWIPE_RIGHT,
	GS_SWIPE_UP,
	GS_SWIPE_DOWN
};

struct CPUserState
{
	CPGestureState	GestureState;
	size_t			NonGestureFrameCount;

	CPUserState() :
		GestureState(GS_NONE),
		NonGestureFrameCount(0)
		{}
};

XnHashT<XnUserID, CPUserState> GUserStates;

void XN_CALLBACK_TYPE HandTracker::Hand_Create(	xn::HandsGenerator& /*generator*/,
												XnUserID			nId,
												const XnPoint3D*	pPosition,
												XnFloat				/*fTime*/,
												void*				pCookie)
{
	printf("New Hand: %d @ (%f,%f,%f)\n", nId, pPosition->X, pPosition->Y, pPosition->Z);

	HandTracker*	pThis = static_cast<HandTracker*>(pCookie);
	if(sm_Instances.Find(pThis) == sm_Instances.End())
	{
		printf("Dead HandTracker: skipped!\n");
		return;
	}

	pThis->m_History[nId].Push(*pPosition);
	GUserStates[nId] = CPUserState();

	// fire JS event
	if (!GJSAPI.expired())
	{
		std::vector<float> Coords(3);
		Coords[0] = pPosition->X;
		Coords[1] = pPosition->Y;
		Coords[2] = pPosition->Z;
		boost::shared_ptr<CPNUIPluginAPI> SharedPtr = GJSAPI.lock();
		SharedPtr->fire_handCreated(pThis->GetSequentialHandID(nId), Coords);
	}
}

static inline const char *GetGestureStringForState(CPGestureState State)
{
	switch (State)
	{
		case GS_NONE:			return "None";
		case GS_SWIPE_LEFT:		return "SwipeLeft";
		case GS_SWIPE_RIGHT:	return "SwipeRight";
		case GS_SWIPE_UP:		return "SwipeUp";
		case GS_SWIPE_DOWN:		return "SwipeDown";
		default:				return "Unknown";
	}
}

void XN_CALLBACK_TYPE HandTracker::Hand_Update(	xn::HandsGenerator& generator,
												XnUserID			nId,
												const XnPoint3D*	pPosition,
												XnFloat				/*fTime*/,
												void*				pCookie)
{
	HandTracker*	pThis = static_cast<HandTracker*>(pCookie);
	if(sm_Instances.Find(pThis) == sm_Instances.End())
	{
		printf("Dead HandTracker: skipped!\n");
		return;
	}

	// Add to this user's hands history
	TrailHistory::Iterator it = pThis->m_History.Find(nId);
	if (it == pThis->m_History.End())
	{
		printf("Dead hand update: skipped!\n");
		return;
	}

	it->Value().Push(*pPosition);

	// fire JS event
	if (!GJSAPI.expired())
	{
		std::vector<float> Coords(3);
		Coords[0] = pPosition->X;
		Coords[1] = pPosition->Y;
		Coords[2] = pPosition->Z;
		boost::shared_ptr<CPNUIPluginAPI> SharedPtr = GJSAPI.lock();
		SharedPtr->fire_handMove(pThis->GetSequentialHandID(nId), Coords);
	}

	// ========================================================================
	// lgodlewski: gesture detection

	XnHashT<XnUserID, CPUserState>::Iterator USIt = GUserStates.Find(nId);
	CPUserState& UserState = USIt->Value();

	CPGestureState DetectedGesture = GS_NONE;
	const Trail& trail = it->Value();
	const Trail::ConstIterator tstart = trail.Begin();
	const Trail::ConstIterator tend = trail.End();

	XnPoint3D Velocity = {0, 0, 0};
	XnPoint3D PreviousPoint = *tstart;
	for (Trail::ConstIterator tit = tstart; tit != tend; ++tit)
	{
		XnPoint3D Point = *tit;
		XnPoint3D FrameDiff;
		FrameDiff.X = Point.X - PreviousPoint.X;
		FrameDiff.Y = Point.Y - PreviousPoint.Y;
		FrameDiff.Z = Point.Z - PreviousPoint.Z;
		PreviousPoint = Point;
		/*printf("Step %d (%f %f %f)\n", CrumbIndex,
			FrameDiff.X, FrameDiff.Y, FrameDiff.Z);*/
		Velocity.X += FrameDiff.X;
		Velocity.Y += FrameDiff.Y;
		Velocity.Z += FrameDiff.Z;
	}

	Velocity.X /= MAX_HAND_TRAIL_LENGTH;
	Velocity.Y /= MAX_HAND_TRAIL_LENGTH;
	Velocity.Z /= MAX_HAND_TRAIL_LENGTH;
	/*printf("Velocity %f (%f %f %f)\n", VelSize,
		Velocity.X, Velocity.Y, Velocity.Z);*/

	const bool bHorizontalSwipe =	fabsf(Velocity.X) > 30.f &&
									fabsf(Velocity.Y) < 5.f;
	const bool bVerticalSwipe = 	fabsf(Velocity.X) < 5.f &&
									fabsf(Velocity.Y) > 30.f;
	if (bHorizontalSwipe)
		DetectedGesture = Velocity.X > 0.f ? GS_SWIPE_LEFT : GS_SWIPE_RIGHT;
	else if (bVerticalSwipe)
		DetectedGesture = Velocity.Y > 0.f ? GS_SWIPE_DOWN : GS_SWIPE_UP;

	// gesture state transitions
	bool bIssueGesture = false;
	/*if (UserState.GestureState != DetectedGesture)
		printf("%s -> %s (%d)\n",
			GetGestureStringForState(UserState.GestureState),
			GetGestureStringForState(DetectedGesture),
			UserState.NonGestureFrameCount);*/
	if (DetectedGesture == GS_NONE)
	{
		if (++UserState.NonGestureFrameCount > 3)
			UserState.GestureState = GS_NONE;
	}
	else
	{
		bIssueGesture = UserState.GestureState == GS_NONE
			? (UserState.NonGestureFrameCount > 3)
			: (UserState.GestureState != DetectedGesture);
		UserState.NonGestureFrameCount = 0;
	}
	if (bIssueGesture)
	{
		if (UserState.GestureState == GS_NONE)
			UserState.GestureState = DetectedGesture;
		const XnChar *GestureString =
			GetGestureStringForState(UserState.GestureState);
		Trail::ConstIterator Bottom = tend;
		--Bottom;
		Gesture_Recognized(
			(*HandTracker::sm_Instances.Begin())->m_GestureGenerator,
			GestureString, &*Bottom, pPosition, pCookie);
		UserState.GestureState = DetectedGesture;
	}
	else if (UserState.GestureState == GS_NONE)
		UserState.GestureState = DetectedGesture;
}

void XN_CALLBACK_TYPE HandTracker::Hand_Destroy(	xn::HandsGenerator& /*generator*/,
													XnUserID			nId,
													XnFloat				/*fTime*/,
													void*				pCookie)
{
	printf("Lost Hand: %d\n", nId);

	HandTracker*	pThis = static_cast<HandTracker*>(pCookie);
	if(sm_Instances.Find(pThis) == sm_Instances.End())
	{
		printf("Dead HandTracker: skipped!\n");
		return;
	}

	// fire JS event
	if (!GJSAPI.expired())
	{
		boost::shared_ptr<CPNUIPluginAPI> SharedPtr = GJSAPI.lock();
		SharedPtr->fire_handDestroyed(pThis->GetSequentialHandID(nId));
	}

	// Remove this user from hands history
	pThis->m_History.Remove(nId);

	GUserStates.Remove(nId);
}


//---------------------------------------------------------------------------
// Method Definitions
//---------------------------------------------------------------------------
HandTracker::HandTracker(xn::Context& context) : m_rContext(context)
{
	// Track all living instances (to protect against calling dead pointers in the Gesture/Hand Generator hooks)
	XnStatus rc = sm_Instances.AddLast(this);
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to add NiHandTracker instance to the list.");
		exit(1);
	}
}

HandTracker::~HandTracker()
{
	// Remove the current instance from living instances list
	XnListT<HandTracker*>::ConstIterator it = sm_Instances.Find(this);
	assert(it != sm_Instances.End());
	sm_Instances.Remove(it);
}

XnStatus HandTracker::Init()
{
	XnStatus			rc;
	XnCallbackHandle	chandle;

	// Create generators
	rc = m_GestureGenerator.Create(m_rContext);
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to create GestureGenerator.");
		return rc;
	}

	rc = m_HandsGenerator.Create(m_rContext);
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to create HandsGenerator.");
		return rc;
	}

	// Register callbacks
	// Using this as cookie
	rc = m_GestureGenerator.RegisterGestureCallbacks(Gesture_Recognized, Gesture_Process, this, chandle);
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to register gesture callbacks.");
		return rc;
	}

	rc = m_HandsGenerator.RegisterHandCallbacks(Hand_Create, Hand_Update, Hand_Destroy, this, chandle);
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to register hand callbacks.");
		return rc;
	}

	printf("Callbacks successfully registered\n");
	return XN_STATUS_OK;
}

XnStatus HandTracker::Run()
{
	//ADD_ALL_GESTURES;

	XnStatus	rc = m_rContext.StartGeneratingAll();
	if (rc != XN_STATUS_OK)
	{
		printf("Unable to start generating.");
		return rc;
	}

	ADD_ALL_GESTURES;

	return XN_STATUS_OK;
}
