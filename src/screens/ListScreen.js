import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Banner, Chip, Empty, EquipmentRow, ErrorBanner, Screen, Segmented, Title, Text } from '../design/components';
import { Ionicons } from '@expo/vector-icons';
import { colors as c } from '../design/tokens';
import { FONT } from '../design/fonts';
import { useApp } from '../state/AppProvider';

export default function ListScreen({ navigation }) {
  const { state, currentUser, run, policy } = useApp(); const [query,setQuery]=useState(''),[focused,setFocused]=useState(false),[kind,setKind]=useState('일반'),[category,setCategory]=useState('전체'),[availability,setAvailability]=useState('전체');
  const categories=['전체',...new Set(state.models.filter(m=>!m.archived&&m.rentalType!=='장기').map(m=>m.category))];
  const [tick,setTick]=useState(0); useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),60000);return()=>clearInterval(t);},[]); // 시간이 지나면 운영 시간·예약 경계가 바뀌므로 1분마다 다시 판정
  // 지금 대여 가능: 오늘 운영하는 날이고 지금 운영 시간 안이며, 지금 바로 내줄 수 있는 정상 기기가 있다. 앞으로의 예약 가능 여부는 예약 달력에서 본다.
  const availableNow=m=>{const now=new Date();if(m.archived||policy.closedDay(state,now)||now<policy.openFor(state,m,now)||now>=policy.closeFor(state,m,now))return false;return policy.availableCount(state,m,now,now.getTime()+60000)>0;};
  const models=useMemo(()=>state.models.filter(m=>!m.archived&& (kind==='전체'||(kind==='장기' ? m.rentalType==='장기' : m.rentalType!=='장기')) && (category==='전체'||m.category===category) && (availability==='전체'||(availability==='가능' ? availableNow(m):!availableNow(m))) && `${m.name} ${m.manufacturer} ${m.purpose}`.toLowerCase().includes(query.toLowerCase())),[state.models,state.bookings,state.hours,state.holidays,query,kind,category,availability,tick]);
  const remember = () => { const q=query.trim(); if(q) run(s=>({...s,searches:{...s.searches,[currentUser.id]:[q,...(s.searches[currentUser.id]||[]).filter(x=>x!==q)].slice(0,5)}})); };
  return <Screen><Title subtitle={`${kind} 대여 ${models.length}개 모델`}>기자재 찾기</Title><ErrorBanner/><View style={s.searchWrap}>
      <TextInput accessibilityLabel="기자재 검색" placeholder="모델명, 제조사, 활용 목적 검색" placeholderTextColor="#94A3B8" value={query} onChangeText={setQuery} onSubmitEditing={remember} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)} style={s.search}/>
      {focused && !query && (state.searches[currentUser.id]||[]).length ? <View style={s.dropdown}>{state.searches[currentUser.id].map(x=><Pressable key={x} accessibilityRole="button" onPress={()=>{setQuery(x);setFocused(false);}} android_ripple={{color:c.softPress}} style={({pressed})=>[s.dropdownRow,pressed&&{backgroundColor:c.softPress}]}><Ionicons name="time-outline" size={16} color={c.muted}/><Text style={s.dropdownText}>{x}</Text></Pressable>)}</View> : null}
    </View>
    <Segmented accessibilityLabel="대여 종류" options={['일반','장기']} value={kind} onChange={x=>{setKind(x);setCategory('전체');}}/>
    {kind!=='장기' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryContent}>{categories.map(x=><Chip key={x} label={x} selected={category===x} onPress={()=>setCategory(x)}/>)}</ScrollView> : null}
    <View style={s.fieldGroup}><Text style={s.caption}>지금 운영 중이고 바로 빌릴 수 있는 기기 기준</Text><Segmented accessibilityLabel="대여 가능 여부" options={['전체','가능','불가']} value={availability} onChange={setAvailability}/></View>
    {kind==='장기'?<Banner text="장기 대여는 6개월 단위이며, 수령 시 지도교수 승인 메일을 현장에서 제시해야 합니다."/>:null}
    {models.length ? <View style={s.list}>{models.map(m=><EquipmentRow key={m.id} model={m} onPress={()=>{remember();navigation.navigate('Detail',{modelId:m.id});}}/>)}</View> : <Empty title="검색 결과가 없습니다" body="다른 검색어나 분류를 선택해 주세요." icon="search-outline"/>}
  </Screen>;
}
const s=StyleSheet.create({list:{gap: 8},fieldGroup:{gap: 8},searchWrap:{position:'relative',zIndex:10},dropdown:{position:'absolute',top:56,left:0,right:0,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:12,overflow:'hidden',shadowColor:c.primary,shadowOpacity:0.08,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:4},dropdownRow:{minHeight:44,flexDirection:'row',alignItems:'center',gap: 8,paddingHorizontal: 16},dropdownText:{fontSize:14,color:c.ink},search:{ fontFamily: FONT.regular,height:52,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:12,paddingHorizontal: 16,color:c.ink,fontSize:15},categoryContent:{gap: 8},caption:{color:c.muted,fontSize:12,marginRight: 4}});
