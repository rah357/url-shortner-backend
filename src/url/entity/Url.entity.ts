import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AudienceData } from './audience.entity';
import { User } from 'src/auth/entity/User.entity';

@Entity()
export class Url {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  shortCode: string;

  @Column()
  originalUrl: string;

  @Column({ nullable: true })
  topic: string;

  @Column({ default: 0 })
  clicks: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.urls, {
    onDelete: 'CASCADE',
    nullable: false,
  }) // Set foreign key
  @JoinColumn({ name: 'userId' }) // Defines the column name in DB
  user: User;

  @OneToMany(() => AudienceData, (audienceData) => audienceData.url)
  audienceData: AudienceData[];
}
