import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Url } from './Url.entity'; // Adjust the path based on your structure

@Entity()
export class AudienceData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ip: string;

  @Column()
  userAgent: string;

  @Column()
  os: string;

  @Column()
  device: string;

  @Column({ nullable: true })
  location: string;

  @CreateDateColumn()
  accessedAt: Date;

  @ManyToOne(() => Url, (url) => url.audienceData, { onDelete: 'CASCADE' })
  url: Url;
}
